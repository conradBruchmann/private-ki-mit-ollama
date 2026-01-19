/**
 * Ollama Embedding Service mit Caching
 * Kapitel 9: RAG-Architekturen
 */

import { Chunk, EmbeddingConfig, DEFAULT_EMBEDDING_CONFIG } from "../types.js";
import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";

interface EmbeddingResponse {
  embedding: number[];
}

export class EmbeddingService {
  private config: EmbeddingConfig;
  private cache: Map<string, number[]> = new Map();
  private cacheLoaded = false;

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = { ...DEFAULT_EMBEDDING_CONFIG, ...config };
  }

  /**
   * Generiert Embedding für einen einzelnen Text
   */
  async embed(text: string): Promise<number[]> {
    // Cache prüfen
    const cacheKey = this.getCacheKey(text);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // API aufrufen
    const embedding = await this.callOllamaAPI(text);

    // In Cache speichern
    await this.saveToCache(cacheKey, embedding);

    return embedding;
  }

  /**
   * Generiert Embeddings für mehrere Texte (Batch)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    const { batchSize } = this.config;

    // In Batches verarbeiten
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((text) => this.embed(text))
      );
      results.push(...batchResults);

      // Fortschritt anzeigen
      const progress = Math.min(i + batchSize, texts.length);
      console.log(`Embeddings: ${progress}/${texts.length}`);
    }

    return results;
  }

  /**
   * Fügt Embeddings zu Chunks hinzu
   */
  async embedChunks(chunks: Chunk[]): Promise<Chunk[]> {
    const texts = chunks.map((c) => c.content);
    const embeddings = await this.embedBatch(texts);

    return chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    }));
  }

  /**
   * Ollama Embedding API aufrufen
   */
  private async callOllamaAPI(text: string): Promise<number[]> {
    const url = `${this.config.baseUrl}/api/embeddings`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Embedding API Fehler: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as EmbeddingResponse;
    return data.embedding;
  }

  /**
   * Generiert Cache-Key aus Text
   */
  private getCacheKey(text: string): string {
    const hash = createHash("sha256")
      .update(`${this.config.model}:${text}`)
      .digest("hex");
    return hash.slice(0, 32);
  }

  /**
   * Lädt Embedding aus Cache
   */
  private async getFromCache(key: string): Promise<number[] | null> {
    if (!this.config.cacheEnabled) return null;

    // In-Memory Cache
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Datei-Cache
    if (this.config.cachePath) {
      try {
        await this.ensureCacheDir();
        const filePath = path.join(this.config.cachePath, `${key}.json`);
        const data = await fs.readFile(filePath, "utf-8");
        const embedding = JSON.parse(data) as number[];
        this.cache.set(key, embedding);
        return embedding;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Speichert Embedding im Cache
   */
  private async saveToCache(key: string, embedding: number[]): Promise<void> {
    if (!this.config.cacheEnabled) return;

    // In-Memory Cache
    this.cache.set(key, embedding);

    // Datei-Cache
    if (this.config.cachePath) {
      try {
        await this.ensureCacheDir();
        const filePath = path.join(this.config.cachePath, `${key}.json`);
        await fs.writeFile(filePath, JSON.stringify(embedding));
      } catch (error) {
        console.warn("Cache-Schreibfehler:", error);
      }
    }
  }

  /**
   * Stellt sicher dass Cache-Verzeichnis existiert
   */
  private async ensureCacheDir(): Promise<void> {
    if (this.config.cachePath) {
      await fs.mkdir(this.config.cachePath, { recursive: true });
    }
  }

  /**
   * Leert den Cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();

    if (this.config.cachePath) {
      try {
        const files = await fs.readdir(this.config.cachePath);
        await Promise.all(
          files.map((f) =>
            fs.unlink(path.join(this.config.cachePath!, f))
          )
        );
      } catch {
        // Ignorieren wenn Verzeichnis nicht existiert
      }
    }
  }

  /**
   * Gibt Cache-Statistiken zurück
   */
  getCacheStats(): { memoryEntries: number } {
    return {
      memoryEntries: this.cache.size,
    };
  }
}
