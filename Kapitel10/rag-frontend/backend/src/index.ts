/**
 * RAG-Frontend Backend Server
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth-routes.js';
import queryRoutes from './routes/query-routes.js';
import documentRoutes from './routes/document-routes.js';
import auditRoutes from './routes/audit-routes.js';

import { userService } from './services/user-service.js';
import { documentService } from './services/document-service.js';
import { queryService } from './services/query-service.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Request-Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit', auditRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Info
app.get('/api', (req, res) => {
  res.json({
    name: 'RAG Frontend API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /auth/login': 'Login',
        'POST /auth/refresh': 'Refresh token',
        'GET /auth/me': 'Current user',
        'POST /auth/users': 'Create user (admin)',
        'GET /auth/users': 'List users (admin/manager)',
      },
      query: {
        'POST /api/query': 'Execute RAG query',
        'POST /api/query/stream': 'Streaming RAG query',
      },
      documents: {
        'GET /api/documents': 'List documents',
        'GET /api/documents/stats': 'Document statistics',
        'GET /api/documents/:id': 'Get document',
        'PATCH /api/documents/:id/access': 'Update access level',
        'DELETE /api/documents/:id': 'Delete document (admin)',
      },
      audit: {
        'GET /api/audit': 'Get audit logs (admin)',
        'GET /api/audit/stats': 'Audit statistics (admin)',
      },
    },
  });
});

// Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Seed-Daten laden und Server starten
async function start() {
  console.log('Seeding demo data...');

  // Demo-User erstellen
  await userService.seed();

  // Demo-Dokumente und Chunks erstellen
  const tenantId = 'demo-tenant';
  const adminUser = await userService.findByEmail('admin@demo.de');
  if (adminUser) {
    await documentService.seed(tenantId, adminUser.id);
    queryService.seed(tenantId);
  }

  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║     RAG-Frontend Backend - Kapitel 10        ║
╠══════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}               ║
║  Health: http://localhost:${PORT}/health        ║
║  API:    http://localhost:${PORT}/api           ║
╠══════════════════════════════════════════════╣
║  Demo-Accounts:                              ║
║    admin@demo.de / admin123                  ║
║    manager@demo.de / manager123              ║
║    mitarbeiter@demo.de / mitarbeiter123      ║
║    gast@demo.de / gast123                    ║
╚══════════════════════════════════════════════╝
    `);
  });
}

start().catch(console.error);
