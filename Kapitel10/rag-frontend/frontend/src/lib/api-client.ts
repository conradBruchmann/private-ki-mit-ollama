/**
 * API Client mit Authentifizierung
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { useAuthStore } from '../stores/auth-store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface QueryResponse {
  answer: string;
  sources: Array<{
    documentId: string;
    title: string;
    excerpt: string;
    accessLevel: string;
    score: number;
  }>;
  metadata: {
    chunksSearched: number;
    chunksUsed: number;
    processingTime: number;
  };
}

export interface Document {
  id: string;
  title: string;
  filename: string;
  fileType: string;
  accessLevel: string;
  tenantId: string;
  department: string;
  tags: string[];
  uploadedBy: string;
  uploadedAt: string;
  chunkCount: number;
  size: number;
}

export interface DocumentStats {
  totalDocuments: number;
  byAccessLevel: Record<string, number>;
  byDepartment: Record<string, number>;
  byFileType: Record<string, number>;
}

class ApiClient {
  private getToken(): string | null {
    return useAuthStore.getState().token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token abgelaufen - versuche Refresh
      try {
        await useAuthStore.getState().refreshAuth();
        // Retry mit neuem Token
        const newToken = useAuthStore.getState().token;
        if (newToken) {
          const retryResponse = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${newToken}`,
              ...options.headers,
            },
          });

          if (retryResponse.ok) {
            return retryResponse.json();
          }
        }
      } catch {
        // Refresh fehlgeschlagen
      }

      useAuthStore.getState().logout();
      throw new Error('Sitzung abgelaufen');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Anfrage fehlgeschlagen' }));
      throw new Error(error.error);
    }

    return response.json();
  }

  // Query API
  async query(
    question: string,
    filters?: { departments?: string[]; documentTypes?: string[] }
  ): Promise<QueryResponse> {
    return this.request<QueryResponse>('/api/query', {
      method: 'POST',
      body: JSON.stringify({ question, filters }),
    });
  }

  // Streaming Query
  async *queryStream(
    question: string,
    filters?: { departments?: string[]; documentTypes?: string[] }
  ): AsyncGenerator<{ type: string; data: unknown }> {
    const token = this.getToken();

    const response = await fetch(`${API_URL}/api/query/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ question, filters }),
    });

    if (!response.ok) {
      throw new Error('Query fehlgeschlagen');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Keine Response Body');
    }

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data;
          } catch {
            // Ignoriere Parse-Fehler
          }
        }
      }
    }
  }

  // Documents API
  async listDocuments(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    accessLevels?: string[];
    departments?: string[];
    fileTypes?: string[];
  }): Promise<{ documents: Document[]; total: number }> {
    const query = new URLSearchParams();

    if (params) {
      if (params.page) query.set('page', String(params.page));
      if (params.pageSize) query.set('pageSize', String(params.pageSize));
      if (params.search) query.set('search', params.search);
      if (params.accessLevels?.length) query.set('accessLevels', params.accessLevels.join(','));
      if (params.departments?.length) query.set('departments', params.departments.join(','));
      if (params.fileTypes?.length) query.set('fileTypes', params.fileTypes.join(','));
    }

    const queryString = query.toString();
    return this.request<{ documents: Document[]; total: number }>(
      `/api/documents${queryString ? '?' + queryString : ''}`
    );
  }

  async getDocument(id: string): Promise<Document> {
    return this.request<Document>(`/api/documents/${id}`);
  }

  async getDocumentStats(): Promise<DocumentStats> {
    return this.request<DocumentStats>('/api/documents/stats');
  }

  async updateDocumentAccess(id: string, accessLevel: string): Promise<Document> {
    return this.request<Document>(`/api/documents/${id}/access`, {
      method: 'PATCH',
      body: JSON.stringify({ accessLevel }),
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request<void>(`/api/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // User API
  async getCurrentUser() {
    return this.request<{
      id: string;
      email: string;
      name: string;
      role: string;
      tenantId: string;
    }>('/auth/me');
  }

  async listUsers() {
    return this.request<
      Array<{
        id: string;
        email: string;
        name: string;
        role: string;
        createdAt: string;
      }>
    >('/auth/users');
  }
}

export const apiClient = new ApiClient();
