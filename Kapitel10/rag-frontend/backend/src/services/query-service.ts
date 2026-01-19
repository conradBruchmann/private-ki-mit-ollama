/**
 * Query Service mit Zugriffskontrolle
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import {
  AuthPayload,
  Role,
  ROLE_ACCESS_LEVELS,
  AccessLevel,
} from '../auth/types.js';
import { documentService, DocumentMetadata } from './document-service.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const RAG_MODEL = process.env.RAG_MODEL || 'llama3.2';

export interface QueryRequest {
  question: string;
  filters?: {
    departments?: string[];
    documentTypes?: string[];
    dateRange?: { from: string; to: string };
  };
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
  metadata: {
    chunksSearched: number;
    chunksUsed: number;
    processingTime: number;
  };
}

export interface Source {
  documentId: string;
  title: string;
  excerpt: string;
  accessLevel: AccessLevel;
  score: number;
}

// Simulierte Chunk-Datenbank (in Produktion: Vector Store)
interface Chunk {
  id: string;
  documentId: string;
  content: string;
  metadata: {
    title: string;
    accessLevel: AccessLevel;
    tenantId: string;
    department: string;
    fileType: string;
  };
}

const chunks: Chunk[] = [];

export class QueryService {
  async query(request: QueryRequest, auth: AuthPayload): Promise<QueryResponse> {
    const startTime = Date.now();

    // 1. Erlaubte Access Levels für User
    const allowedLevels = ROLE_ACCESS_LEVELS[auth.role as Role];

    // 2. Relevante Chunks finden (simuliert)
    let relevantChunks = chunks.filter(
      (c) =>
        c.metadata.tenantId === auth.tenantId &&
        allowedLevels.includes(c.metadata.accessLevel)
    );

    // 3. Zusätzliche Filter anwenden
    if (request.filters?.departments?.length) {
      relevantChunks = relevantChunks.filter((c) =>
        request.filters!.departments!.includes(c.metadata.department)
      );
    }

    if (request.filters?.documentTypes?.length) {
      relevantChunks = relevantChunks.filter((c) =>
        request.filters!.documentTypes!.includes(c.metadata.fileType)
      );
    }

    // 4. Keyword-Suche (simulierte Relevanz)
    const keywords = request.question.toLowerCase().split(' ');
    const scoredChunks = relevantChunks.map((chunk) => {
      const contentLower = chunk.content.toLowerCase();
      const score = keywords.reduce((acc, kw) => {
        return acc + (contentLower.includes(kw) ? 1 : 0);
      }, 0) / keywords.length;
      return { ...chunk, score };
    });

    // 5. Top-5 Chunks auswählen
    const topChunks = scoredChunks
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // 6. Antwort generieren
    const answer = await this.generateAnswer(request.question, topChunks, auth);

    const processingTime = Date.now() - startTime;

    return {
      answer,
      sources: topChunks.map((c) => ({
        documentId: c.documentId,
        title: c.metadata.title,
        excerpt: c.content.substring(0, 200) + '...',
        accessLevel: c.metadata.accessLevel,
        score: c.score,
      })),
      metadata: {
        chunksSearched: relevantChunks.length,
        chunksUsed: topChunks.length,
        processingTime,
      },
    };
  }

  private async generateAnswer(
    question: string,
    chunks: Array<Chunk & { score: number }>,
    auth: AuthPayload
  ): Promise<string> {
    if (chunks.length === 0) {
      return 'Zu dieser Frage wurden keine passenden Dokumente in Ihrem Zugriffsbereich gefunden.';
    }

    const context = chunks
      .map(
        (c, i) =>
          `[Quelle ${i + 1}: ${c.metadata.title}]\n${c.content}`
      )
      .join('\n\n---\n\n');

    const prompt = `Du bist ein Unternehmens-Assistent. Beantworte die Frage basierend auf den Dokumenten.

BENUTZERKONTEXT:
- Rolle: ${auth.role}
- Tenant: ${auth.tenantId}

WICHTIG:
- Antworte NUR mit Informationen aus den Dokumenten
- Verweise auf die Quellen mit [Quelle X]
- Antworte auf Deutsch
- Sei präzise und professionell

DOKUMENTE:
${context}

FRAGE: ${question}

ANTWORT:`;

    try {
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: RAG_MODEL,
          prompt,
          stream: false,
          options: { temperature: 0.3 },
        }),
      });

      if (!response.ok) {
        throw new Error('Ollama request failed');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('LLM error:', error);
      // Fallback: Kontextbasierte Antwort ohne LLM
      return `Basierend auf den gefundenen Dokumenten:\n\n${chunks
        .map((c, i) => `**[Quelle ${i + 1}]** ${c.metadata.title}:\n${c.content.substring(0, 300)}...`)
        .join('\n\n')}`;
    }
  }

  // Chunks für ein Dokument hinzufügen (simuliert)
  addChunks(document: DocumentMetadata, contents: string[]): void {
    for (const content of contents) {
      chunks.push({
        id: crypto.randomUUID(),
        documentId: document.id,
        content,
        metadata: {
          title: document.title,
          accessLevel: document.accessLevel,
          tenantId: document.tenantId,
          department: document.department,
          fileType: document.fileType,
        },
      });
    }
  }

  // Seed-Methode für Entwicklung
  seed(tenantId: string): void {
    const sampleChunks: Omit<Chunk, 'id'>[] = [
      {
        documentId: 'doc-1',
        content: 'Die Urlaubsregelung sieht vor, dass alle Mitarbeiter 30 Urlaubstage pro Jahr haben. Urlaubsanträge müssen mindestens 2 Wochen vor Antritt eingereicht werden.',
        metadata: { title: 'Urlaubsregelung', accessLevel: 'public', tenantId, department: 'HR', fileType: 'pdf' },
      },
      {
        documentId: 'doc-1',
        content: 'Nicht genommener Urlaub kann bis zum 31. März des Folgejahres übertragen werden. Darüber hinaus verfällt der Urlaubsanspruch.',
        metadata: { title: 'Urlaubsregelung', accessLevel: 'public', tenantId, department: 'HR', fileType: 'pdf' },
      },
      {
        documentId: 'doc-2',
        content: 'Der Onboarding-Prozess für neue Mitarbeiter umfasst: 1. IT-Equipment-Ausgabe am ersten Tag, 2. Einführungsgespräch mit der Führungskraft, 3. Schulungen in der ersten Woche.',
        metadata: { title: 'Mitarbeiterhandbuch', accessLevel: 'internal', tenantId, department: 'HR', fileType: 'pdf' },
      },
      {
        documentId: 'doc-3',
        content: 'IT-Sicherheitsrichtlinie: Alle Passwörter müssen mindestens 12 Zeichen lang sein und Groß-, Kleinbuchstaben, Zahlen und Sonderzeichen enthalten.',
        metadata: { title: 'IT-Sicherheitsrichtlinien', accessLevel: 'confidential', tenantId, department: 'IT', fileType: 'pdf' },
      },
      {
        documentId: 'doc-3',
        content: 'Bei Verdacht auf einen Sicherheitsvorfall ist sofort die IT-Hotline unter security@firma.de zu kontaktieren. Niemals eigenständig Maßnahmen ergreifen.',
        metadata: { title: 'IT-Sicherheitsrichtlinien', accessLevel: 'confidential', tenantId, department: 'IT', fileType: 'pdf' },
      },
      {
        documentId: 'doc-4',
        content: 'Finanzbericht Q4: Der Umsatz stieg um 15% auf 12,5 Mio EUR. Die EBIT-Marge verbesserte sich auf 18%. Die Prognose für Q1 liegt bei 14 Mio EUR.',
        metadata: { title: 'Finanzbericht Q4', accessLevel: 'restricted', tenantId, department: 'Finance', fileType: 'xlsx' },
      },
    ];

    for (const chunk of sampleChunks) {
      chunks.push({ id: crypto.randomUUID(), ...chunk });
    }

    console.log(`Seeded ${sampleChunks.length} chunks`);
  }
}

// Singleton-Export
export const queryService = new QueryService();
