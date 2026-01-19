/**
 * RAG Pipeline - Typdefinitionen
 * Kapitel 9: RAG-Architekturen
 */

// Basis-Dokument aus einem Loader
export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  source: string;
  filename: string;
  filetype: string;
  title?: string;
  author?: string;
  createdAt?: Date;
  pageNumber?: number;
  chunkIndex?: number;
  totalChunks?: number;
  [key: string]: unknown;
}

// Chunk nach der Verarbeitung
export interface Chunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata: ChunkMetadata;
}

export interface ChunkMetadata extends DocumentMetadata {
  documentId: string;
  chunkIndex: number;
  totalChunks: number;
  startChar: number;
  endChar: number;
}

// Suchergebnis
export interface SearchResult {
  chunk: Chunk;
  score: number;
  distance: number;
}

// Query-Kontext für RAG
export interface QueryContext {
  query: string;
  results: SearchResult[];
  augmentedPrompt: string;
}

// Loader-Konfiguration
export interface LoaderConfig {
  extractMetadata?: boolean;
  encoding?: BufferEncoding;
}

// Chunking-Konfiguration
export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
  separators?: string[];
  keepSeparator?: boolean;
}

// Embedding-Konfiguration
export interface EmbeddingConfig {
  model: string;
  baseUrl: string;
  batchSize: number;
  cacheEnabled: boolean;
  cachePath?: string;
}

// Vector Store Konfiguration
export interface VectorStoreConfig {
  dbPath: string;
  tableName: string;
  dimension: number;
}

// Pipeline-Konfiguration
export interface PipelineConfig {
  chunking: ChunkingConfig;
  embedding: EmbeddingConfig;
  vectorStore: VectorStoreConfig;
}

// Default-Konfigurationen
export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", " ", ""],
  keepSeparator: true,
};

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  model: "nomic-embed-text",
  baseUrl: "http://localhost:11434",
  batchSize: 32,
  cacheEnabled: true,
  cachePath: "./.embedding-cache",
};

export const DEFAULT_VECTOR_STORE_CONFIG: VectorStoreConfig = {
  dbPath: "./vector.db",
  tableName: "documents",
  dimension: 768,
};
