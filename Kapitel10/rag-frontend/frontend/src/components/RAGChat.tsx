/**
 * RAG Chat-Komponente
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { useState, useRef, useEffect, FormEvent } from 'react';
import { apiClient, QueryResponse } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: QueryResponse['sources'];
  metadata?: QueryResponse['metadata'];
  isStreaming?: boolean;
}

export function RAGChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<{
    departments: string[];
    documentTypes: string[];
  }>({ departments: [], documentTypes: [] });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Placeholder für Streaming-Antwort
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      },
    ]);

    try {
      let content = '';
      let sources: QueryResponse['sources'] = [];
      let metadata: QueryResponse['metadata'] | undefined;

      for await (const chunk of apiClient.queryStream(input, {
        departments: filters.departments.length ? filters.departments : undefined,
        documentTypes: filters.documentTypes.length ? filters.documentTypes : undefined,
      })) {
        if (chunk.type === 'sources') {
          sources = chunk.data as QueryResponse['sources'];
        } else if (chunk.type === 'content') {
          content += chunk.data as string;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content } : m
            )
          );
        } else if (chunk.type === 'metadata') {
          metadata = chunk.data as QueryResponse['metadata'];
        } else if (chunk.type === 'done') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content, sources, metadata, isStreaming: false }
                : m
            )
          );
        } else if (chunk.type === 'error') {
          throw new Error(chunk.data as string);
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const exampleQuestions = [
    'Was sind die Urlaubsregelungen?',
    'Wie funktioniert der Onboarding-Prozess?',
    'Was sind die IT-Sicherheitsrichtlinien?',
  ];

  return (
    <div className="rag-chat">
      <div className="chat-sidebar">
        <h3>Filter</h3>

        <div className="filter-group">
          <label>Abteilung</label>
          <div className="filter-options">
            {['HR', 'IT', 'Finance', 'Sales'].map((dept) => (
              <label key={dept} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.departments.includes(dept)}
                  onChange={(e) => {
                    setFilters((prev) => ({
                      ...prev,
                      departments: e.target.checked
                        ? [...prev.departments, dept]
                        : prev.departments.filter((d) => d !== dept),
                    }));
                  }}
                />
                {dept}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Dateityp</label>
          <div className="filter-options">
            {['pdf', 'docx', 'md', 'xlsx'].map((type) => (
              <label key={type} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.documentTypes.includes(type)}
                  onChange={(e) => {
                    setFilters((prev) => ({
                      ...prev,
                      documentTypes: e.target.checked
                        ? [...prev.documentTypes, type]
                        : prev.documentTypes.filter((t) => t !== type),
                    }));
                  }}
                />
                {type.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        {(filters.departments.length > 0 || filters.documentTypes.length > 0) && (
          <button
            className="clear-filters"
            onClick={() => setFilters({ departments: [], documentTypes: [] })}
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      <div className="chat-main">
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Willkommen, {user?.name}!</h2>
              <p>
                Stellen Sie Fragen zu den Dokumenten in Ihrem Zugriffsbereich.
              </p>
              <div className="example-questions">
                <p>Beispiele:</p>
                {exampleQuestions.map((q, i) => (
                  <button key={i} onClick={() => setInput(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Stellen Sie eine Frage..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? '...' : 'Senden'}
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const [showSources, setShowSources] = useState(false);

  return (
    <div className={`message message-${message.role}`}>
      <div className="message-content">
        {message.content}
        {message.isStreaming && <span className="cursor-blink">|</span>}
      </div>

      {message.sources && message.sources.length > 0 && (
        <div className="message-sources">
          <button
            className="sources-toggle"
            onClick={() => setShowSources(!showSources)}
          >
            {showSources
              ? 'Quellen ausblenden'
              : `${message.sources.length} Quellen anzeigen`}
          </button>

          {showSources && (
            <div className="sources-list">
              {message.sources.map((source, i) => (
                <div key={i} className="source-item">
                  <div className="source-header">
                    <span className="source-title">{source.title}</span>
                    <span className={`access-badge access-${source.accessLevel}`}>
                      {source.accessLevel}
                    </span>
                    <span className="source-score">
                      {Math.round(source.score * 100)}%
                    </span>
                  </div>
                  <p className="source-excerpt">{source.excerpt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {message.metadata && (
        <div className="message-meta">
          {message.metadata.chunksUsed} Dokumente in {message.metadata.processingTime}ms
        </div>
      )}
    </div>
  );
}
