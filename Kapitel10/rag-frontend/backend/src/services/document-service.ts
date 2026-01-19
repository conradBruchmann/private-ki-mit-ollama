/**
 * Document Service mit Zugriffskontrolle
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { v4 as uuid } from 'uuid';
import {
  AccessLevel,
  AuthPayload,
  Role,
  ROLE_ACCESS_LEVELS,
} from '../auth/types.js';

export interface DocumentMetadata {
  id: string;
  title: string;
  filename: string;
  fileType: string;
  accessLevel: AccessLevel;
  tenantId: string;
  department: string;
  tags: string[];
  uploadedBy: string;
  uploadedAt: Date;
  chunkCount: number;
  size: number;
}

export interface DocumentFilter {
  accessLevels?: AccessLevel[];
  departments?: string[];
  fileTypes?: string[];
  tags?: string[];
  search?: string;
}

// In-Memory Store (in Produktion: Datenbank)
const documents: Map<string, DocumentMetadata> = new Map();

export class DocumentService {
  async createDocument(
    metadata: Omit<DocumentMetadata, 'id' | 'uploadedAt' | 'uploadedBy'>,
    auth: AuthPayload
  ): Promise<DocumentMetadata> {
    // Zugriffslevel-Berechtigung prüfen
    const allowedLevels = ROLE_ACCESS_LEVELS[auth.role as Role];
    if (!allowedLevels.includes(metadata.accessLevel)) {
      throw new Error(`Cannot create document with access level: ${metadata.accessLevel}`);
    }

    const doc: DocumentMetadata = {
      ...metadata,
      id: uuid(),
      uploadedAt: new Date(),
      uploadedBy: auth.userId,
    };

    documents.set(doc.id, doc);
    return doc;
  }

  async listDocuments(
    auth: AuthPayload,
    filter?: DocumentFilter,
    pagination?: { page: number; pageSize: number }
  ): Promise<{ documents: DocumentMetadata[]; total: number }> {
    const allowedLevels = ROLE_ACCESS_LEVELS[auth.role as Role];

    let docs = Array.from(documents.values())
      // Tenant-Filter
      .filter((d) => d.tenantId === auth.tenantId)
      // Access-Level-Filter
      .filter((d) => allowedLevels.includes(d.accessLevel));

    // Zusätzliche Filter
    if (filter) {
      if (filter.accessLevels?.length) {
        docs = docs.filter((d) => filter.accessLevels!.includes(d.accessLevel));
      }
      if (filter.departments?.length) {
        docs = docs.filter((d) => filter.departments!.includes(d.department));
      }
      if (filter.fileTypes?.length) {
        docs = docs.filter((d) => filter.fileTypes!.includes(d.fileType));
      }
      if (filter.tags?.length) {
        docs = docs.filter((d) => d.tags.some((t) => filter.tags!.includes(t)));
      }
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        docs = docs.filter(
          (d) =>
            d.title.toLowerCase().includes(searchLower) ||
            d.filename.toLowerCase().includes(searchLower)
        );
      }
    }

    // Sortieren nach Upload-Datum (neueste zuerst)
    docs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    const total = docs.length;

    // Pagination
    if (pagination) {
      const start = (pagination.page - 1) * pagination.pageSize;
      docs = docs.slice(start, start + pagination.pageSize);
    }

    return { documents: docs, total };
  }

  async getDocument(id: string, auth: AuthPayload): Promise<DocumentMetadata | null> {
    const doc = documents.get(id);
    if (!doc) return null;

    // Tenant-Check
    if (doc.tenantId !== auth.tenantId) return null;

    // Access-Level-Check
    const allowedLevels = ROLE_ACCESS_LEVELS[auth.role as Role];
    if (!allowedLevels.includes(doc.accessLevel)) return null;

    return doc;
  }

  async updateAccessLevel(
    id: string,
    newLevel: AccessLevel,
    auth: AuthPayload
  ): Promise<DocumentMetadata> {
    const doc = await this.getDocument(id, auth);
    if (!doc) {
      throw new Error('Document not found or access denied');
    }

    // Nur Admin und Manager können Access Level ändern
    if (!['admin', 'manager'].includes(auth.role)) {
      throw new Error('Insufficient permissions to change access level');
    }

    // Manager kann nicht auf "restricted" setzen
    if (auth.role === 'manager' && newLevel === 'restricted') {
      throw new Error('Managers cannot set restricted access level');
    }

    doc.accessLevel = newLevel;
    documents.set(id, doc);
    return doc;
  }

  async deleteDocument(id: string, auth: AuthPayload): Promise<void> {
    const doc = await this.getDocument(id, auth);
    if (!doc) {
      throw new Error('Document not found or access denied');
    }

    // Nur Admin kann löschen
    if (auth.role !== 'admin') {
      throw new Error('Only admins can delete documents');
    }

    documents.delete(id);
  }

  // Statistiken für Dashboard
  async getStats(auth: AuthPayload): Promise<{
    totalDocuments: number;
    byAccessLevel: Record<AccessLevel, number>;
    byDepartment: Record<string, number>;
    byFileType: Record<string, number>;
  }> {
    const { documents: docs } = await this.listDocuments(auth);

    const byAccessLevel: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};
    const byFileType: Record<string, number> = {};

    for (const doc of docs) {
      byAccessLevel[doc.accessLevel] = (byAccessLevel[doc.accessLevel] || 0) + 1;
      byDepartment[doc.department] = (byDepartment[doc.department] || 0) + 1;
      byFileType[doc.fileType] = (byFileType[doc.fileType] || 0) + 1;
    }

    return {
      totalDocuments: docs.length,
      byAccessLevel: byAccessLevel as Record<AccessLevel, number>,
      byDepartment,
      byFileType,
    };
  }

  // Seed-Methode für Entwicklung
  async seed(tenantId: string, userId: string): Promise<void> {
    const sampleDocs: Omit<DocumentMetadata, 'id' | 'uploadedAt' | 'uploadedBy'>[] = [
      {
        title: 'Mitarbeiterhandbuch 2024',
        filename: 'mitarbeiterhandbuch-2024.pdf',
        fileType: 'pdf',
        accessLevel: 'internal',
        tenantId,
        department: 'HR',
        tags: ['onboarding', 'richtlinien'],
        chunkCount: 45,
        size: 2048000,
      },
      {
        title: 'Urlaubsregelung',
        filename: 'urlaubsregelung.pdf',
        fileType: 'pdf',
        accessLevel: 'public',
        tenantId,
        department: 'HR',
        tags: ['urlaub', 'richtlinien'],
        chunkCount: 12,
        size: 512000,
      },
      {
        title: 'IT-Sicherheitsrichtlinien',
        filename: 'it-security-policy.pdf',
        fileType: 'pdf',
        accessLevel: 'confidential',
        tenantId,
        department: 'IT',
        tags: ['security', 'richtlinien'],
        chunkCount: 28,
        size: 1024000,
      },
      {
        title: 'Finanzbericht Q4',
        filename: 'finanzbericht-q4.xlsx',
        fileType: 'xlsx',
        accessLevel: 'restricted',
        tenantId,
        department: 'Finance',
        tags: ['finanzen', 'report'],
        chunkCount: 15,
        size: 768000,
      },
      {
        title: 'Produktkatalog',
        filename: 'produktkatalog.pdf',
        fileType: 'pdf',
        accessLevel: 'public',
        tenantId,
        department: 'Sales',
        tags: ['produkte', 'vertrieb'],
        chunkCount: 60,
        size: 5120000,
      },
      {
        title: 'Entwickler-Dokumentation',
        filename: 'dev-docs.md',
        fileType: 'md',
        accessLevel: 'internal',
        tenantId,
        department: 'IT',
        tags: ['entwicklung', 'dokumentation'],
        chunkCount: 35,
        size: 256000,
      },
    ];

    for (const doc of sampleDocs) {
      const fullDoc: DocumentMetadata = {
        ...doc,
        id: uuid(),
        uploadedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        uploadedBy: userId,
      };
      documents.set(fullDoc.id, fullDoc);
    }

    console.log(`Seeded ${sampleDocs.length} documents`);
  }
}

// Singleton-Export
export const documentService = new DocumentService();
