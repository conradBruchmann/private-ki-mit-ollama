/**
 * SQLite Vector Store
 * Kapitel 9: RAG-Architekturen
 *
 * Verwendet Cosine Similarity für Vektor-Suche
 */

import Database from "better-sqlite3";
import { Chunk, SearchResult, VectorStoreConfig, DEFAULT_VECTOR_STORE_CONFIG } from "../types.js";

export class SQLiteVectorStore {
  private db: Database.Database;
  private config: VectorStoreConfig;

  constructor(config: Partial<VectorStoreConfig> = {}) {
    this.config = { ...DEFAULT_VECTOR_STORE_CONFIG, ...config };
    this.db = new Database(this.config.dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialisiert die Datenbank-Tabellen
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding BLOB NOT NULL,
        metadata TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_created
        ON ${this.config.tableName}(created_at);
    `);
  }

  /**
   * Fügt einen Chunk hinzu
   */
  add(chunk: Chunk): void {
    if (!chunk.embedding) {
      throw new Error("Chunk hat kein Embedding");
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.config.tableName}
      (id, content, embedding, metadata)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      chunk.id,
      chunk.content,
      Buffer.from(new Float32Array(chunk.embedding).buffer),
      JSON.stringify(chunk.metadata)
    );
  }

  /**
   * Fügt mehrere Chunks hinzu (Batch)
   */
  addMany(chunks: Chunk[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.config.tableName}
      (id, content, embedding, metadata)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((chunks: Chunk[]) => {
      for (const chunk of chunks) {
        if (!chunk.embedding) {
          console.warn(`Chunk ${chunk.id} hat kein Embedding, übersprungen`);
          continue;
        }
        stmt.run(
          chunk.id,
          chunk.content,
          Buffer.from(new Float32Array(chunk.embedding).buffer),
          JSON.stringify(chunk.metadata)
        );
      }
    });

    insertMany(chunks);
    console.log(`${chunks.length} Chunks in Vector Store gespeichert`);
  }

  /**
   * Sucht ähnliche Chunks basierend auf Query-Embedding
   */
  search(queryEmbedding: number[], topK: number = 5): SearchResult[] {
    const allDocs = this.db
      .prepare(
        `SELECT id, content, embedding, metadata FROM ${this.config.tableName}`
      )
      .all() as Array<{
        id: string;
        content: string;
        embedding: Buffer;
        metadata: string;
      }>;

    // Cosine Similarity berechnen
    const results: SearchResult[] = allDocs.map((doc) => {
      const embedding = Array.from(
        new Float32Array(doc.embedding.buffer, doc.embedding.byteOffset, doc.embedding.length / 4)
      );
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      return {
        chunk: {
          id: doc.id,
          content: doc.content,
          embedding,
          metadata: JSON.parse(doc.metadata),
        },
        score: similarity,
        distance: 1 - similarity,
      };
    });

    // Nach Ähnlichkeit sortieren und Top-K zurückgeben
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Berechnet Cosine Similarity zwischen zwei Vektoren
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vektoren haben unterschiedliche Dimensionen");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Löscht einen Chunk
   */
  delete(id: string): void {
    this.db
      .prepare(`DELETE FROM ${this.config.tableName} WHERE id = ?`)
      .run(id);
  }

  /**
   * Löscht alle Chunks eines Dokuments
   */
  deleteByDocument(documentId: string): void {
    this.db
      .prepare(
        `DELETE FROM ${this.config.tableName}
         WHERE json_extract(metadata, '$.documentId') = ?`
      )
      .run(documentId);
  }

  /**
   * Löscht alle Chunks einer Quelle
   */
  deleteBySource(source: string): void {
    this.db
      .prepare(
        `DELETE FROM ${this.config.tableName}
         WHERE json_extract(metadata, '$.source') = ?`
      )
      .run(source);
  }

  /**
   * Gibt Statistiken zurück
   */
  getStats(): { count: number; sources: string[] } {
    const countResult = this.db
      .prepare(`SELECT COUNT(*) as count FROM ${this.config.tableName}`)
      .get() as { count: number };

    const sourcesResult = this.db
      .prepare(
        `SELECT DISTINCT json_extract(metadata, '$.source') as source
         FROM ${this.config.tableName}`
      )
      .all() as Array<{ source: string }>;

    return {
      count: countResult.count,
      sources: sourcesResult.map((r) => r.source),
    };
  }

  /**
   * Leert den gesamten Store
   */
  clear(): void {
    this.db.prepare(`DELETE FROM ${this.config.tableName}`).run();
  }

  /**
   * Schließt die Datenbankverbindung
   */
  close(): void {
    this.db.close();
  }
}
