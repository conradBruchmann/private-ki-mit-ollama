/**
 * OllamaService - Vollständiger Service für Ollama-Integration
 *
 * Beispiel aus Kapitel 5: API-Zugriff und Integration
 */

import ollama, { Message } from "ollama";

export interface ChatOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  numPredict?: number;
  numCtx?: number;
  repeatPenalty?: number;
  seed?: number;
  stop?: string[];
}

export class OllamaService {
  private model: string;
  private history: Message[] = [];

  constructor(model: string = "llama3.2") {
    this.model = model;
  }

  /**
   * Einfacher Chat ohne Streaming
   */
  async chat(userMessage: string, options?: ChatOptions): Promise<string> {
    this.history.push({ role: "user", content: userMessage });

    const response = await ollama.chat({
      model: this.model,
      messages: this.history,
      options: options
        ? {
            temperature: options.temperature,
            top_p: options.topP,
            top_k: options.topK,
            num_predict: options.numPredict,
            num_ctx: options.numCtx,
            repeat_penalty: options.repeatPenalty,
            seed: options.seed,
            stop: options.stop,
          }
        : undefined,
    });

    const assistantMessage = response.message.content;
    this.history.push({ role: "assistant", content: assistantMessage });

    return assistantMessage;
  }

  /**
   * Chat mit Streaming - gibt Token für Token zurück
   */
  async *streamChat(
    userMessage: string,
    options?: ChatOptions
  ): AsyncGenerator<string> {
    this.history.push({ role: "user", content: userMessage });

    const response = await ollama.chat({
      model: this.model,
      messages: this.history,
      stream: true,
      options: options
        ? {
            temperature: options.temperature,
            top_p: options.topP,
            top_k: options.topK,
            num_predict: options.numPredict,
          }
        : undefined,
    });

    let fullResponse = "";
    for await (const part of response) {
      const content = part.message.content;
      fullResponse += content;
      yield content;
    }

    this.history.push({ role: "assistant", content: fullResponse });
  }

  /**
   * System-Prompt setzen (löscht bisherige History)
   */
  setSystemPrompt(prompt: string): void {
    this.history = [{ role: "system", content: prompt }];
  }

  /**
   * History löschen (behält System-Prompt)
   */
  clearHistory(): void {
    const systemMessage = this.history.find((m) => m.role === "system");
    this.history = systemMessage ? [systemMessage] : [];
  }

  /**
   * Embeddings generieren
   */
  async embed(text: string, model: string = "nomic-embed-text"): Promise<number[]> {
    const response = await ollama.embed({
      model,
      input: text,
    });
    return response.embeddings[0];
  }

  /**
   * Mehrere Texte auf einmal embedden
   */
  async embedBatch(
    texts: string[],
    model: string = "nomic-embed-text"
  ): Promise<number[][]> {
    const response = await ollama.embed({
      model,
      input: texts,
    });
    return response.embeddings;
  }

  /**
   * Text-Completion (nicht Chat)
   */
  async complete(prompt: string, options?: ChatOptions): Promise<string> {
    const response = await ollama.generate({
      model: this.model,
      prompt,
      stream: false,
      options: options
        ? {
            temperature: options.temperature,
            num_predict: options.numPredict,
          }
        : undefined,
    });

    return response.response;
  }

  /**
   * Aktuelles Modell wechseln
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Aktuelle History abrufen
   */
  getHistory(): Message[] {
    return [...this.history];
  }

  /**
   * Prüfen ob Ollama erreichbar ist
   */
  static async isHealthy(): Promise<boolean> {
    try {
      await ollama.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verfügbare Modelle auflisten
   */
  static async listModels(): Promise<string[]> {
    const response = await ollama.list();
    return response.models.map((m) => m.name);
  }
}

/**
 * Fehlerklasse für Ollama-spezifische Fehler
 */
export class OllamaError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

/**
 * Chat mit Retry-Logik
 */
export async function safeChatWithRetry(
  service: OllamaService,
  message: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await service.chat(message);
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message.toLowerCase();

      // Nicht-wiederholbare Fehler
      if (errorMessage.includes("model") && errorMessage.includes("not found")) {
        throw new OllamaError(
          `Model not found. Run: ollama pull <model>`,
          "MODEL_NOT_FOUND",
          false
        );
      }

      // Wiederholbare Fehler
      if (
        errorMessage.includes("connection") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("econnrefused")
      ) {
        console.warn(`Attempt ${attempt}/${maxRetries} failed, retrying...`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }

      throw error;
    }
  }

  throw new OllamaError(
    `Failed after ${maxRetries} attempts: ${lastError?.message}`,
    "MAX_RETRIES_EXCEEDED",
    false
  );
}
