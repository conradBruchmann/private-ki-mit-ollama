/**
 * Audit Routes für Compliance-Logs
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { Router, Request, Response } from 'express';
import { auditService, AuditEventType } from '../services/audit-service.js';
import { authenticate, requireRole } from '../auth/middleware.js';

const router = Router();

// GET /api/audit - Audit-Events abrufen (nur Admin)
router.get('/', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const {
    page = '1',
    pageSize = '50',
    userId,
    eventType,
    resourceType,
    from,
    to,
    success,
  } = req.query;

  const filters: {
    userId?: string;
    eventType?: AuditEventType;
    resourceType?: 'document' | 'query' | 'user' | 'auth';
    from?: Date;
    to?: Date;
    success?: boolean;
  } = {};

  if (userId) filters.userId = userId as string;
  if (eventType) filters.eventType = eventType as AuditEventType;
  if (resourceType) filters.resourceType = resourceType as 'document' | 'query' | 'user' | 'auth';
  if (from) filters.from = new Date(from as string);
  if (to) filters.to = new Date(to as string);
  if (success !== undefined) filters.success = success === 'true';

  const result = await auditService.getEvents(
    req.auth!.tenantId,
    filters,
    {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    }
  );

  res.json(result);
});

// GET /api/audit/stats - Audit-Statistiken (nur Admin)
router.get('/stats', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const { from, to } = req.query;

  const timeRange = {
    from: from ? new Date(from as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: to ? new Date(to as string) : new Date(),
  };

  const stats = await auditService.getStats(req.auth!.tenantId, timeRange);
  res.json(stats);
});

export default router;
