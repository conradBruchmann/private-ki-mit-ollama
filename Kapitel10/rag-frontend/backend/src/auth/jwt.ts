/**
 * JWT-Authentifizierung
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import jwt from 'jsonwebtoken';
import { AuthPayload, User, getPermissionsForRole } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export function generateToken(user: User): string {
  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    permissions: getPermissionsForRole(user.role),
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export function decodeToken(token: string): AuthPayload | null {
  try {
    return jwt.decode(token) as AuthPayload;
  } catch {
    return null;
  }
}

// Refresh Token generieren (längere Laufzeit)
export function generateRefreshToken(user: User): string {
  return jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyRefreshToken(token: string): { userId: string } {
  const payload = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };
  if (payload.type !== 'refresh') {
    throw new Error('Invalid refresh token');
  }
  return { userId: payload.userId };
}
