/**
 * Ingestion Pipeline - Dokumente laden und indexieren
 * Kapitel 9: RAG-Architekturen
 */

import { Document, Chunk, PipelineConfig, DEFAULT_CHUNKING_CONFIG, DEFAULT_EMBEDDING_CONFIG, DEFAULT_VECTOR_STORE_CONFIG } from "../types.js";
import { UnifiedLoader } from "../loaders/index.js";
import { TextPreprocessor, RecursiveChunker, MarkdownChunker } from "../processing/index.js";
import { EmbeddingService } from "../embedding/index.js";
import { SQLiteVectorStore } from "../storage/index.js";

export interface IngestionResult {
  documentsLoaded: number;
  chunksCreated: number;
  embeddingsGenerated: number;
  errors: string[];
}

export class IngestionPipeline {
  private loader: UnifiedLoader;
  private preprocessor: TextPreprocessor;
  private chunker: RecursiveChunker;
  private embeddingService: EmbeddingService;
  private vectorStore: SQLiteVectorStore;

  constructor(config: Partial<PipelineConfig> = {}) {
    const chunkingConfig = { ...DEFAULT_CHUNKING_CONFIG, ...config.chunking };
    const embeddingConfig = { ...DEFAULT_EMBEDDING_CONFIG, ...config.embedding };
    const vectorStoreConfig = { ...DEFAULT_VECTOR_STORE_CONFIG, ...config.vectorStore };

    this.loader = new UnifiedLoader();
    this.preprocessor = new TextPreprocessor();
    this.chunker = new RecursiveChunker(chunkingConfig);
    this.embeddingService = new EmbeddingService(embeddingConfig);
    this.vectorStore = new SQLiteVectorStore(vectorStoreConfig);
  }

  /**
   * Verarbeitet eine einzelne Datei
   */
  async ingestFile(filePath: string): Promise<IngestionResult> {
    return this.ingestFiles([filePath]);
  }

  /**
   * Verarbeitet mehrere Dateien
   */
  async ingestFiles(filePaths: string[]): Promise<IngestionResult> {
    const result: IngestionResult = {
      documentsLoaded: 0,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      errors: [],
    };

    try {
      // 1. Dokumente laden
      console.log("\n📄 Lade Dokumente...");
      const documents = await this.loader.loadFiles(filePaths);
      result.documentsLoaded = documents.length;
      console.log(`   ${documents.length} Dokument(e) geladen`);

      if (documents.length === 0) {
        return result;
      }

      // 2. Preprocessing
      console.log("\n🔧 Preprocessing...");
      const preprocessed = documents.map((doc) => ({
        ...doc,
        content: this.preprocessor.process(doc.content),
      }));

      // 3. Chunking
      console.log("\n✂️  Chunking...");
      const chunks = this.chunker.chunkDocuments(preprocessed);
      result.chunksCreated = chunks.length;
      console.log(`   ${chunks.length} Chunk(s) erstellt`);

      // 4. Embeddings generieren
      console.log("\n🧮 Generiere Embeddings...");
      const embeddedChunks = await this.embeddingService.embedChunks(chunks);
      result.embeddingsGenerated = embeddedChunks.length;

      // 5. In Vector Store speichern
      console.log("\n💾 Speichere in Vector Store...");
      this.vectorStore.addMany(embeddedChunks);

      console.log("\n✅ Ingestion abgeschlossen!");
      console.log(this.getStats());

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      console.error("\n❌ Fehler:", errorMessage);
    }

    return result;
  }

  /**
   * Verarbeitet ein Verzeichnis
   */
  async ingestDirectory(
    dirPath: string,
    pattern: string = "**/*"
  ): Promise<IngestionResult> {
    const result: IngestionResult = {
      documentsLoaded: 0,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      errors: [],
    };

    try {
      // 1. Dokumente aus Verzeichnis laden
      console.log(`\n📁 Lade Dokumente aus: ${dirPath}`);
      const documents = await this.loader.loadDirectory(dirPath, pattern);
      result.documentsLoaded = documents.length;

      if (documents.length === 0) {
        console.log("   Keine unterstützten Dokumente gefunden");
        return result;
      }

      // 2. Preprocessing
      console.log("\n🔧 Preprocessing...");
      const preprocessed = documents.map((doc) => ({
        ...doc,
        content: this.preprocessor.process(doc.content),
      }));

      // 3. Chunking
      console.log("\n✂️  Chunking...");
      const chunks = this.chunker.chunkDocuments(preprocessed);
      result.chunksCreated = chunks.length;
      console.log(`   ${chunks.length} Chunk(s) erstellt`);

      // 4. Embeddings
      console.log("\n🧮 Generiere Embeddings...");
      const embeddedChunks = await this.embeddingService.embedChunks(chunks);
      result.embeddingsGenerated = embeddedChunks.length;

      // 5. Speichern
      console.log("\n💾 Speichere in Vector Store...");
      this.vectorStore.addMany(embeddedChunks);

      console.log("\n✅ Ingestion abgeschlossen!");
      console.log(this.getStats());

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      console.error("\n❌ Fehler:", errorMessage);
    }

    return result;
  }

  /**
   * Gibt Statistiken zurück
   */
  getStats(): string {
    const stats = this.vectorStore.getStats();
    const cacheStats = this.embeddingService.getCacheStats();

    return `
📊 Vector Store Statistiken:
   - Chunks: ${stats.count}
   - Quellen: ${stats.sources.length}
   - Embedding Cache: ${cacheStats.memoryEntries} Einträge
`;
  }

  /**
   * Schließt alle Ressourcen
   */
  close(): void {
    this.vectorStore.close();
  }
}
