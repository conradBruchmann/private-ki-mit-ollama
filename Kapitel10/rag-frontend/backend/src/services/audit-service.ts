/**
 * Audit Service für Compliance-Logging
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { v4 as uuid } from 'uuid';

export type AuditEventType =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'query'
  | 'document_view'
  | 'document_create'
  | 'document_update'
  | 'document_delete'
  | 'access_denied'
  | 'user_create'
  | 'user_update'
  | 'user_delete';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId: string;
  tenantId: string;
  resourceType: 'document' | 'query' | 'user' | 'auth';
  resourceId?: string;
  action: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
}

// In-Memory Store (in Produktion: Log-Aggregator wie ELK, Splunk)
const events: AuditEvent[] = [];

export class AuditService {
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      id: uuid(),
      timestamp: new Date(),
    };

    events.push(auditEvent);

    // Strukturiertes Logging für Log-Aggregator
    console.log(
      JSON.stringify({
        level: 'audit',
        ...auditEvent,
        timestamp: auditEvent.timestamp.toISOString(),
      })
    );
  }

  async getEvents(
    tenantId: string,
    filters?: {
      userId?: string;
      eventType?: AuditEventType;
      resourceType?: AuditEvent['resourceType'];
      from?: Date;
      to?: Date;
      success?: boolean;
    },
    pagination?: { page: number; pageSize: number }
  ): Promise<{ events: AuditEvent[]; total: number }> {
    let filtered = events.filter((e) => e.tenantId === tenantId);

    if (filters) {
      if (filters.userId) {
        filtered = filtered.filter((e) => e.userId === filters.userId);
      }
      if (filters.eventType) {
        filtered = filtered.filter((e) => e.eventType === filters.eventType);
      }
      if (filters.resourceType) {
        filtered = filtered.filter((e) => e.resourceType === filters.resourceType);
      }
      if (filters.from) {
        filtered = filtered.filter((e) => e.timestamp >= filters.from!);
      }
      if (filters.to) {
        filtered = filtered.filter((e) => e.timestamp <= filters.to!);
      }
      if (filters.success !== undefined) {
        filtered = filtered.filter((e) => e.success === filters.success);
      }
    }

    // Sortieren nach Zeitstempel (neueste zuerst)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filtered.length;

    if (pagination) {
      const start = (pagination.page - 1) * pagination.pageSize;
      filtered = filtered.slice(start, start + pagination.pageSize);
    }

    return { events: filtered, total };
  }

  // Statistiken für Dashboard
  async getStats(
    tenantId: string,
    timeRange: { from: Date; to: Date }
  ): Promise<{
    totalEvents: number;
    byEventType: Record<string, number>;
    byResourceType: Record<string, number>;
    failedAttempts: number;
    uniqueUsers: number;
  }> {
    const filtered = events.filter(
      (e) =>
        e.tenantId === tenantId &&
        e.timestamp >= timeRange.from &&
        e.timestamp <= timeRange.to
    );

    const byEventType: Record<string, number> = {};
    const byResourceType: Record<string, number> = {};
    const userIds = new Set<string>();

    let failedAttempts = 0;

    for (const event of filtered) {
      byEventType[event.eventType] = (byEventType[event.eventType] || 0) + 1;
      byResourceType[event.resourceType] = (byResourceType[event.resourceType] || 0) + 1;
      userIds.add(event.userId);
      if (!event.success) failedAttempts++;
    }

    return {
      totalEvents: filtered.length,
      byEventType,
      byResourceType,
      failedAttempts,
      uniqueUsers: userIds.size,
    };
  }

  // Convenience-Methoden für häufige Events
  logLogin(userId: string, tenantId: string, ip: string, userAgent: string, success: boolean): Promise<void> {
    return this.log({
      eventType: success ? 'login' : 'login_failed',
      userId,
      tenantId,
      resourceType: 'auth',
      action: success ? 'User logged in' : 'Login attempt failed',
      details: {},
      ipAddress: ip,
      userAgent,
      success,
    });
  }

  logQuery(userId: string, tenantId: string, question: string, sourcesCount: number, ip: string, userAgent: string): Promise<void> {
    return this.log({
      eventType: 'query',
      userId,
      tenantId,
      resourceType: 'query',
      action: 'RAG query executed',
      details: {
        questionPreview: question.substring(0, 100),
        sourcesUsed: sourcesCount,
      },
      ipAddress: ip,
      userAgent,
      success: true,
    });
  }

  logDocumentAccess(
    userId: string,
    tenantId: string,
    documentId: string,
    eventType: 'document_view' | 'document_create' | 'document_update' | 'document_delete',
    ip: string,
    userAgent: string,
    success: boolean
  ): Promise<void> {
    return this.log({
      eventType,
      userId,
      tenantId,
      resourceType: 'document',
      resourceId: documentId,
      action: `Document ${eventType.replace('document_', '')}`,
      details: {},
      ipAddress: ip,
      userAgent,
      success,
    });
  }

  logAccessDenied(userId: string, tenantId: string, resource: string, action: string, ip: string, userAgent: string): Promise<void> {
    return this.log({
      eventType: 'access_denied',
      userId,
      tenantId,
      resourceType: 'auth',
      action: `Access denied: ${action}`,
      details: { resource },
      ipAddress: ip,
      userAgent,
      success: false,
    });
  }
}

// Singleton-Export
export const auditService = new AuditService();
