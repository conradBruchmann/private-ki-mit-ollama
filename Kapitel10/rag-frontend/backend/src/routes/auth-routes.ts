/**
 * Auth Routes
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { Router, Request, Response } from 'express';
import { userService } from '../services/user-service.js';
import { auditService } from '../services/audit-service.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../auth/jwt.js';
import { authenticate, requireRole } from '../auth/middleware.js';
import { Role } from '../auth/types.js';

const router = Router();

// Helper für IP und User-Agent
function getClientInfo(req: Request): { ip: string; userAgent: string } {
  return {
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
  };
}

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { ip, userAgent } = getClientInfo(req);

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const user = await userService.authenticate(email, password);

  if (!user) {
    await auditService.logLogin('unknown', 'unknown', ip, userAgent, false);
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  await auditService.logLogin(user.id, user.tenantId, ip, userAgent, true);

  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    },
  });
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const { userId } = verifyRefreshToken(refreshToken);
    const user = await userService.findById(userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await userService.findById(req.auth!.userId);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

// POST /auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const { ip, userAgent } = getClientInfo(req);

  await auditService.log({
    eventType: 'logout',
    userId: req.auth!.userId,
    tenantId: req.auth!.tenantId,
    resourceType: 'auth',
    action: 'User logged out',
    details: {},
    ipAddress: ip,
    userAgent,
    success: true,
  });

  res.json({ message: 'Logged out successfully' });
});

// POST /auth/users - User erstellen (nur Admin)
router.post('/users', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const { email, password, name, role, department } = req.body;
  const { ip, userAgent } = getClientInfo(req);

  if (!email || !password || !name || !role) {
    res.status(400).json({ error: 'Email, password, name, and role required' });
    return;
  }

  try {
    const user = await userService.createUser(
      email,
      password,
      name,
      role as Role,
      req.auth!.tenantId,
      department
    );

    await auditService.log({
      eventType: 'user_create',
      userId: req.auth!.userId,
      tenantId: req.auth!.tenantId,
      resourceType: 'user',
      resourceId: user.id,
      action: 'User created',
      details: { email, role },
      ipAddress: ip,
      userAgent,
      success: true,
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /auth/users - User auflisten (Admin und Manager)
router.get('/users', authenticate, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  const users = await userService.listUsers(req.auth!.tenantId);
  res.json(users);
});

// PATCH /auth/users/:id - User aktualisieren (nur Admin)
router.patch('/users/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const { name, role, department } = req.body;
  const { ip, userAgent } = getClientInfo(req);

  try {
    const user = await userService.updateUser(req.params.id, { name, role, department });

    await auditService.log({
      eventType: 'user_update',
      userId: req.auth!.userId,
      tenantId: req.auth!.tenantId,
      resourceType: 'user',
      resourceId: req.params.id,
      action: 'User updated',
      details: { name, role, department },
      ipAddress: ip,
      userAgent,
      success: true,
    });

    res.json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /auth/users/:id - User löschen (nur Admin)
router.delete('/users/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const { ip, userAgent } = getClientInfo(req);

  try {
    await userService.deleteUser(req.params.id);

    await auditService.log({
      eventType: 'user_delete',
      userId: req.auth!.userId,
      tenantId: req.auth!.tenantId,
      resourceType: 'user',
      resourceId: req.params.id,
      action: 'User deleted',
      details: {},
      ipAddress: ip,
      userAgent,
      success: true,
    });

    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
