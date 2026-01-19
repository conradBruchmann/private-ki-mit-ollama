/**
 * Query Pipeline - Suche und Antwortgenerierung
 * Kapitel 9: RAG-Architekturen
 */

import { SearchResult, QueryContext, PipelineConfig, DEFAULT_EMBEDDING_CONFIG, DEFAULT_VECTOR_STORE_CONFIG } from "../types.js";
import { EmbeddingService } from "../embedding/index.js";
import { SQLiteVectorStore } from "../storage/index.js";

interface QueryOptions {
  topK?: number;
  minScore?: number;
  includeMetadata?: boolean;
}

interface GenerateOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_SYSTEM_PROMPT = `Du bist ein hilfreicher Assistent. Beantworte die Frage basierend auf dem gegebenen Kontext.
Wenn du die Antwort nicht im Kontext findest, sage das ehrlich.
Antworte auf Deutsch.`;

export class QueryPipeline {
  private embeddingService: EmbeddingService;
  private vectorStore: SQLiteVectorStore;
  private baseUrl: string;

  constructor(config: Partial<PipelineConfig> = {}) {
    const embeddingConfig = { ...DEFAULT_EMBEDDING_CONFIG, ...config.embedding };
    const vectorStoreConfig = { ...DEFAULT_VECTOR_STORE_CONFIG, ...config.vectorStore };

    this.embeddingService = new EmbeddingService(embeddingConfig);
    this.vectorStore = new SQLiteVectorStore(vectorStoreConfig);
    this.baseUrl = embeddingConfig.baseUrl;
  }

  /**
   * Sucht relevante Chunks für eine Query
   */
  async search(query: string, options: QueryOptions = {}): Promise<SearchResult[]> {
    const { topK = 5, minScore = 0.0 } = options;

    // Query-Embedding generieren
    const queryEmbedding = await this.embeddingService.embed(query);

    // Im Vector Store suchen
    const results = this.vectorStore.search(queryEmbedding, topK);

    // Nach minScore filtern
    return results.filter((r) => r.score >= minScore);
  }

  /**
   * Erstellt einen erweiterten Prompt mit Kontext
   */
  async createContext(
    query: string,
    options: QueryOptions = {}
  ): Promise<QueryContext> {
    const results = await this.search(query, options);

    // Kontext aus Suchergebnissen zusammenstellen
    const contextParts = results.map((result, index) => {
      const source = result.chunk.metadata.source || "Unbekannt";
      const filename = result.chunk.metadata.filename || "";
      return `[Quelle ${index + 1}: ${filename}]\n${result.chunk.content}`;
    });

    const contextText = contextParts.join("\n\n---\n\n");

    const augmentedPrompt = `Kontext:
${contextText}

---

Frage: ${query}

Antwort:`;

    return {
      query,
      results,
      augmentedPrompt,
    };
  }

  /**
   * Führt RAG-Query durch und generiert Antwort
   */
  async query(
    query: string,
    queryOptions: QueryOptions = {},
    generateOptions: GenerateOptions = {}
  ): Promise<{ answer: string; context: QueryContext }> {
    // Kontext abrufen
    const context = await this.createContext(query, queryOptions);

    if (context.results.length === 0) {
      return {
        answer: "Ich konnte keine relevanten Informationen zu Ihrer Frage finden.",
        context,
      };
    }

    // Antwort generieren
    const answer = await this.generate(context.augmentedPrompt, generateOptions);

    return { answer, context };
  }

  /**
   * Generiert eine Antwort mit Ollama
   */
  private async generate(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<string> {
    const {
      model = "llama3.2",
      systemPrompt = DEFAULT_SYSTEM_PROMPT,
      temperature = 0.7,
      maxTokens = 1024,
    } = options;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API Fehler: ${response.status}`);
    }

    const data = await response.json() as { message: { content: string } };
    return data.message.content;
  }

  /**
   * Streaming-Version der Query
   */
  async *queryStream(
    query: string,
    queryOptions: QueryOptions = {},
    generateOptions: GenerateOptions = {}
  ): AsyncGenerator<string> {
    // Kontext abrufen
    const context = await this.createContext(query, queryOptions);

    if (context.results.length === 0) {
      yield "Ich konnte keine relevanten Informationen zu Ihrer Frage finden.";
      return;
    }

    // Streaming-Antwort generieren
    yield* this.generateStream(context.augmentedPrompt, generateOptions);
  }

  /**
   * Streaming-Generierung mit Ollama
   */
  private async *generateStream(
    prompt: string,
    options: GenerateOptions = {}
  ): AsyncGenerator<string> {
    const {
      model = "llama3.2",
      systemPrompt = DEFAULT_SYSTEM_PROMPT,
      temperature = 0.7,
      maxTokens = 1024,
    } = options;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        stream: true,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API Fehler: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Keine Response Body");

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line) as { message?: { content: string }; done: boolean };
          if (data.message?.content) {
            yield data.message.content;
          }
        } catch {
          // Ignorieren bei Parse-Fehlern
        }
      }
    }
  }

  /**
   * Schließt alle Ressourcen
   */
  close(): void {
    this.vectorStore.close();
  }
}
