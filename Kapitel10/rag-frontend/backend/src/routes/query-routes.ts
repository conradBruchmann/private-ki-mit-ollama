/**
 * Query Routes für RAG-Anfragen
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { Router, Request, Response } from 'express';
import { queryService } from '../services/query-service.js';
import { auditService } from '../services/audit-service.js';
import { authenticate } from '../auth/middleware.js';

const router = Router();

// Helper für IP und User-Agent
function getClientInfo(req: Request): { ip: string; userAgent: string } {
  return {
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
  };
}

// POST /api/query - RAG-Query ausführen
router.post('/', authenticate, async (req: Request, res: Response) => {
  const { question, filters } = req.body;
  const { ip, userAgent } = getClientInfo(req);

  if (!question) {
    res.status(400).json({ error: 'Question is required' });
    return;
  }

  try {
    const result = await queryService.query({ question, filters }, req.auth!);

    // Audit-Logging
    await auditService.logQuery(
      req.auth!.userId,
      req.auth!.tenantId,
      question,
      result.sources.length,
      ip,
      userAgent
    );

    res.json(result);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

// POST /api/query/stream - Streaming RAG-Query
router.post('/stream', authenticate, async (req: Request, res: Response) => {
  const { question, filters } = req.body;
  const { ip, userAgent } = getClientInfo(req);

  if (!question) {
    res.status(400).json({ error: 'Question is required' });
    return;
  }

  // SSE Headers setzen
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const result = await queryService.query({ question, filters }, req.auth!);

    // Quellen zuerst senden
    res.write(`data: ${JSON.stringify({ type: 'sources', data: result.sources })}\n\n`);

    // Antwort in Teilen senden (für Streaming-Effekt)
    const words = result.answer.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + ' ';
      res.write(`data: ${JSON.stringify({ type: 'content', data: chunk })}\n\n`);
      // Kleine Verzögerung für Streaming-Effekt
      await new Promise((r) => setTimeout(r, 30));
    }

    // Metadata und Abschluss
    res.write(`data: ${JSON.stringify({ type: 'metadata', data: result.metadata })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

    // Audit-Logging
    await auditService.logQuery(
      req.auth!.userId,
      req.auth!.tenantId,
      question,
      result.sources.length,
      ip,
      userAgent
    );

    res.end();
  } catch (error) {
    console.error('Streaming query error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', data: 'Query failed' })}\n\n`);
    res.end();
  }
});

export default router;
