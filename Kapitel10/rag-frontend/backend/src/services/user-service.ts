/**
 * User Service
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { User, Role } from '../auth/types.js';

interface UserWithPassword extends User {
  passwordHash: string;
}

// In-Memory Store (in Produktion: Datenbank)
const users: Map<string, UserWithPassword> = new Map();

export class UserService {
  async createUser(
    email: string,
    password: string,
    name: string,
    role: Role,
    tenantId: string,
    department?: string
  ): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user: UserWithPassword = {
      id: uuid(),
      email,
      name,
      role,
      tenantId,
      department,
      passwordHash,
      createdAt: new Date(),
    };

    users.set(user.id, user);
    return this.sanitize(user);
  }

  async authenticate(email: string, password: string): Promise<User | null> {
    const user = Array.from(users.values()).find((u) => u.email === email);
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return this.sanitize(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = users.get(id);
    return user ? this.sanitize(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = Array.from(users.values()).find((u) => u.email === email);
    return user ? this.sanitize(user) : null;
  }

  async listUsers(tenantId: string): Promise<User[]> {
    return Array.from(users.values())
      .filter((u) => u.tenantId === tenantId)
      .map((u) => this.sanitize(u));
  }

  async updateUser(
    id: string,
    updates: Partial<Pick<User, 'name' | 'role' | 'department'>>
  ): Promise<User> {
    const user = users.get(id);
    if (!user) {
      throw new Error('User not found');
    }

    Object.assign(user, updates);
    users.set(id, user);
    return this.sanitize(user);
  }

  async deleteUser(id: string): Promise<void> {
    if (!users.has(id)) {
      throw new Error('User not found');
    }
    users.delete(id);
  }

  async changePassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = users.get(id);
    if (!user) {
      throw new Error('User not found');
    }

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid current password');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    users.set(id, user);
  }

  private sanitize(user: UserWithPassword): User {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  // Seed-Methode für Entwicklung
  async seed(): Promise<void> {
    const defaultTenant = 'demo-tenant';

    const seedUsers = [
      { email: 'admin@demo.de', password: 'admin123', name: 'Admin User', role: 'admin' as Role },
      { email: 'manager@demo.de', password: 'manager123', name: 'Manager User', role: 'manager' as Role },
      { email: 'mitarbeiter@demo.de', password: 'mitarbeiter123', name: 'Mitarbeiter User', role: 'employee' as Role },
      { email: 'gast@demo.de', password: 'gast123', name: 'Gast User', role: 'guest' as Role },
    ];

    for (const u of seedUsers) {
      try {
        await this.createUser(u.email, u.password, u.name, u.role, defaultTenant);
        console.log(`Created user: ${u.email}`);
      } catch {
        // User existiert bereits
      }
    }
  }
}

// Singleton-Export
export const userService = new UserService();
