/**
 * Document Routes
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { Router, Request, Response } from 'express';
import { documentService, DocumentFilter } from '../services/document-service.js';
import { auditService } from '../services/audit-service.js';
import { authenticate, requireRole } from '../auth/middleware.js';
import { AccessLevel } from '../auth/types.js';

const router = Router();

// Helper für IP und User-Agent
function getClientInfo(req: Request): { ip: string; userAgent: string } {
  return {
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
  };
}

// GET /api/documents - Dokumente auflisten
router.get('/', authenticate, async (req: Request, res: Response) => {
  const {
    page = '1',
    pageSize = '20',
    search,
    accessLevels,
    departments,
    fileTypes,
    tags,
  } = req.query;

  const filter: DocumentFilter = {};

  if (search) filter.search = search as string;
  if (accessLevels) filter.accessLevels = (accessLevels as string).split(',') as AccessLevel[];
  if (departments) filter.departments = (departments as string).split(',');
  if (fileTypes) filter.fileTypes = (fileTypes as string).split(',');
  if (tags) filter.tags = (tags as string).split(',');

  const result = await documentService.listDocuments(
    req.auth!,
    filter,
    {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    }
  );

  res.json(result);
});

// GET /api/documents/stats - Statistiken
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  const stats = await documentService.getStats(req.auth!);
  res.json(stats);
});

// GET /api/documents/:id - Einzelnes Dokument
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const { ip, userAgent } = getClientInfo(req);
  const doc = await documentService.getDocument(req.params.id, req.auth!);

  if (!doc) {
    await auditService.logDocumentAccess(
      req.auth!.userId,
      req.auth!.tenantId,
      req.params.id,
      'document_view',
      ip,
      userAgent,
      false
    );
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  await auditService.logDocumentAccess(
    req.auth!.userId,
    req.auth!.tenantId,
    doc.id,
    'document_view',
    ip,
    userAgent,
    true
  );

  res.json(doc);
});

// PATCH /api/documents/:id/access - Access Level ändern
router.patch(
  '/:id/access',
  authenticate,
  requireRole('admin', 'manager'),
  async (req: Request, res: Response) => {
    const { accessLevel } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    if (!accessLevel) {
      res.status(400).json({ error: 'Access level required' });
      return;
    }

    try {
      const doc = await documentService.updateAccessLevel(
        req.params.id,
        accessLevel as AccessLevel,
        req.auth!
      );

      await auditService.logDocumentAccess(
        req.auth!.userId,
        req.auth!.tenantId,
        doc.id,
        'document_update',
        ip,
        userAgent,
        true
      );

      res.json(doc);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
);

// DELETE /api/documents/:id - Dokument löschen
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const { ip, userAgent } = getClientInfo(req);

    try {
      await documentService.deleteDocument(req.params.id, req.auth!);

      await auditService.logDocumentAccess(
        req.auth!.userId,
        req.auth!.tenantId,
        req.params.id,
        'document_delete',
        ip,
        userAgent,
        true
      );

      res.status(204).end();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
);

export default router;
