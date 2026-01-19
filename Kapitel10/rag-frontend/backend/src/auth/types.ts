/**
 * Auth-Typen für Zugriffskontrolle
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

export type Role = 'admin' | 'manager' | 'employee' | 'guest';

export type AccessLevel = 'public' | 'internal' | 'confidential' | 'restricted';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  department?: string;
  createdAt: Date;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
  tenantId: string;
  permissions: Permission[];
}

export interface Permission {
  resource: string;
  actions: ('read' | 'write' | 'delete')[];
}

// Rollen-Zugriffsmatrix: Welche Rolle darf welche AccessLevel sehen
export const ROLE_ACCESS_LEVELS: Record<Role, AccessLevel[]> = {
  admin: ['public', 'internal', 'confidential', 'restricted'],
  manager: ['public', 'internal', 'confidential'],
  employee: ['public', 'internal'],
  guest: ['public'],
};

// Prüfen ob eine Rolle auf ein AccessLevel zugreifen darf
export function canAccessLevel(role: Role, level: AccessLevel): boolean {
  return ROLE_ACCESS_LEVELS[role].includes(level);
}

// Alle erlaubten AccessLevels für eine Rolle
export function getAllowedLevels(role: Role): AccessLevel[] {
  return ROLE_ACCESS_LEVELS[role];
}

// Permissions für Rollen
export function getPermissionsForRole(role: Role): Permission[] {
  const basePermissions: Permission[] = [
    { resource: 'documents', actions: ['read'] },
    { resource: 'query', actions: ['read'] },
  ];

  if (role === 'admin') {
    return [
      { resource: 'documents', actions: ['read', 'write', 'delete'] },
      { resource: 'query', actions: ['read'] },
      { resource: 'users', actions: ['read', 'write', 'delete'] },
      { resource: 'audit', actions: ['read'] },
    ];
  }

  if (role === 'manager') {
    return [
      { resource: 'documents', actions: ['read', 'write'] },
      { resource: 'query', actions: ['read'] },
      { resource: 'users', actions: ['read'] },
    ];
  }

  return basePermissions;
}
