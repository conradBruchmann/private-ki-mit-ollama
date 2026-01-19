/**
 * Audit Log-Komponente (nur Admin)
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth-store';

interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  userId: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  details: Record<string, unknown>;
  ipAddress: string;
  success: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    eventType: '',
    resourceType: '',
    success: '',
  });

  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    loadEvents();
  }, [page, filters]);

  async function loadEvents() {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });

      if (filters.eventType) params.set('eventType', filters.eventType);
      if (filters.resourceType) params.set('resourceType', filters.resourceType);
      if (filters.success) params.set('success', filters.success);

      const response = await fetch(`${API_URL}/api/audit?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load audit logs');

      const data = await response.json();
      setEvents(data.events);
      setTotal(data.total);
    } catch (error) {
      console.error('Audit log error:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="audit-log">
      <div className="audit-header">
        <h2>Audit-Log</h2>
        <div className="audit-filters">
          <select
            value={filters.eventType}
            onChange={(e) =>
              setFilters((f) => ({ ...f, eventType: e.target.value }))
            }
          >
            <option value="">Alle Events</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="query">Query</option>
            <option value="document_view">Dokument angesehen</option>
            <option value="document_update">Dokument geändert</option>
            <option value="access_denied">Zugriff verweigert</option>
          </select>

          <select
            value={filters.resourceType}
            onChange={(e) =>
              setFilters((f) => ({ ...f, resourceType: e.target.value }))
            }
          >
            <option value="">Alle Ressourcen</option>
            <option value="auth">Auth</option>
            <option value="query">Query</option>
            <option value="document">Dokument</option>
            <option value="user">User</option>
          </select>

          <select
            value={filters.success}
            onChange={(e) =>
              setFilters((f) => ({ ...f, success: e.target.value }))
            }
          >
            <option value="">Alle</option>
            <option value="true">Erfolgreich</option>
            <option value="false">Fehlgeschlagen</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Lade Audit-Logs...</div>
      ) : (
        <>
          <table className="audit-table">
            <thead>
              <tr>
                <th>Zeitpunkt</th>
                <th>Event</th>
                <th>Ressource</th>
                <th>Aktion</th>
                <th>IP</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className={event.success ? '' : 'failed-row'}>
                  <td>
                    {new Date(event.timestamp).toLocaleString('de-DE')}
                  </td>
                  <td>
                    <span className={`event-badge event-${event.eventType}`}>
                      {event.eventType}
                    </span>
                  </td>
                  <td>
                    {event.resourceType}
                    {event.resourceId && (
                      <span className="resource-id">#{event.resourceId.slice(0, 8)}</span>
                    )}
                  </td>
                  <td>{event.action}</td>
                  <td className="ip-cell">{event.ipAddress}</td>
                  <td>
                    <span className={`status-badge ${event.success ? 'success' : 'failed'}`}>
                      {event.success ? '✓' : '✗'}
                    </span>
                  </td>
                </tr>
              ))}
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
