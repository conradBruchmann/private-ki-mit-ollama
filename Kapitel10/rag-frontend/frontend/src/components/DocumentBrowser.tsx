/**
 * Document Browser-Komponente
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { useState, useEffect } from 'react';
import { apiClient, Document, DocumentStats } from '../lib/api-client';
import { useAuthStore, isManager, isAdmin } from '../stores/auth-store';

export function DocumentBrowser() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const canManage = isManager(user);
  const canDelete = isAdmin(user);

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, [page, search]);

  async function loadDocuments() {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.listDocuments({
        page,
        pageSize,
        search: search || undefined,
      });
      setDocuments(result.documents);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const result = await apiClient.getDocumentStats();
      setStats(result);
    } catch {
      // Stats sind optional
    }
  }

  async function handleAccessChange(docId: string, newLevel: string) {
    try {
      await apiClient.updateDocumentAccess(docId, newLevel);
      loadDocuments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm('Dokument wirklich löschen?')) return;

    try {
      await apiClient.deleteDocument(docId);
      loadDocuments();
      loadStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  }

  const accessLevelOptions = isAdmin(user)
    ? ['public', 'internal', 'confidential', 'restricted']
    : ['public', 'internal', 'confidential'];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="document-browser">
      <div className="browser-header">
        <h2>Dokumente</h2>
        <div className="search-box">
          <input
            type="search"
            placeholder="Dokumente durchsuchen..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {stats && (
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-value">{stats.totalDocuments}</span>
            <span className="stat-label">Dokumente</span>
          </div>
          <div className="stat">
            <span className="stat-value">{Object.keys(stats.byDepartment).length}</span>
            <span className="stat-label">Abteilungen</span>
          </div>
          <div className="stat">
            <span className="stat-value">{Object.keys(stats.byFileType).length}</span>
            <span className="stat-label">Dateitypen</span>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Lade Dokumente...</div>
      ) : (
        <>
          <table className="documents-table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Typ</th>
                <th>Abteilung</th>
                <th>Zugriffsstufe</th>
                <th>Hochgeladen</th>
                {canManage && <th>Aktionen</th>}
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="empty-row">
                    Keine Dokumente gefunden
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="doc-title">{doc.title}</div>
                      <div className="doc-filename">{doc.filename}</div>
                    </td>
                    <td>
                      <span className={`type-badge type-${doc.fileType}`}>
                        {doc.fileType.toUpperCase()}
                      </span>
                    </td>
                    <td>{doc.department}</td>
                    <td>
                      <span className={`access-badge access-${doc.accessLevel}`}>
                        {doc.accessLevel}
                      </span>
                    </td>
                    <td>{new Date(doc.uploadedAt).toLocaleDateString('de-DE')}</td>
                    {canManage && (
                      <td className="actions-cell">
                        <select
                          value={doc.accessLevel}
                          onChange={(e) => handleAccessChange(doc.id, e.target.value)}
                          className="access-select"
                        >
                          {accessLevelOptions.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="delete-button"
                            title="Löschen"
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Zurück
              </button>
              <span>
                Seite {page} von {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Weiter
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
