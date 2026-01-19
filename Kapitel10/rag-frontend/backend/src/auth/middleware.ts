/**
 * Auth Middleware
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt.js';
import { AuthPayload, Role, AccessLevel, canAccessLevel, ROLE_ACCESS_LEVELS } from './types.js';

// Request-Typ erweitern
declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

// Authentifizierung prüfen
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyToken(token);
    req.auth = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Rolle(n) erforderlich
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.auth.role as Role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.auth.role,
      });
      return;
    }

    next();
  };
}

// Mindest-Zugriffslevel erforderlich
export function requireAccessLevel(level: AccessLevel) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!canAccessLevel(req.auth.role as Role, level)) {
      res.status(403).json({
        error: 'Access level not permitted',
        required: level,
        yourAccess: ROLE_ACCESS_LEVELS[req.auth.role as Role],
      });
      return;
    }

    next();
  };
}

// Optional authentifizieren (Token wird geprüft wenn vorhanden)
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      req.auth = verifyToken(token);
    } catch {
      // Token ungültig, aber wir erlauben trotzdem Zugriff (als Guest)
    }
  }

  next();
}

// Tenant-Isolation prüfen
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Prüfen ob Tenant-ID im Request mit Auth übereinstimmt
  const requestTenantId = req.params.tenantId || req.body?.tenantId;

  if (requestTenantId && requestTenantId !== req.auth.tenantId) {
    // Admin kann auf alle Tenants zugreifen
    if (req.auth.role !== 'admin') {
      res.status(403).json({ error: 'Cross-tenant access denied' });
      return;
    }
  }

  next();
}
