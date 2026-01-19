/**
 * Text Chunker - Rekursives Text Splitting
 * Kapitel 9: RAG-Architekturen
 */

import { Document, Chunk, ChunkMetadata, ChunkingConfig, DEFAULT_CHUNKING_CONFIG } from "../types.js";
import { randomUUID } from "crypto";

export class RecursiveChunker {
  private config: ChunkingConfig;

  constructor(config: Partial<ChunkingConfig> = {}) {
    this.config = { ...DEFAULT_CHUNKING_CONFIG, ...config };
  }

  /**
   * Chunked ein einzelnes Dokument
   */
  chunkDocument(document: Document): Chunk[] {
    const chunks = this.splitText(document.content);

    return chunks.map((chunkContent, index) => {
      const startChar = this.findStartPosition(document.content, chunkContent, index);

      const metadata: ChunkMetadata = {
        ...document.metadata,
        documentId: document.id,
        chunkIndex: index,
        totalChunks: chunks.length,
        startChar,
        endChar: startChar + chunkContent.length,
      };

      return {
        id: randomUUID(),
        content: chunkContent,
        metadata,
      };
    });
  }

  /**
   * Chunked mehrere Dokumente
   */
  chunkDocuments(documents: Document[]): Chunk[] {
    return documents.flatMap((doc) => this.chunkDocument(doc));
  }

  /**
   * Rekursives Text Splitting
   */
  private splitText(text: string): string[] {
    const { chunkSize, chunkOverlap, separators, keepSeparator } = this.config;

    // Wenn Text klein genug ist, direkt zurückgeben
    if (text.length <= chunkSize) {
      return text.trim() ? [text.trim()] : [];
    }

    // Rekursiv mit verschiedenen Separatoren versuchen
    return this.splitRecursive(text, separators!, 0);
  }

  /**
   * Rekursive Split-Logik
   */
  private splitRecursive(
    text: string,
    separators: string[],
    depth: number
  ): string[] {
    const { chunkSize, chunkOverlap, keepSeparator } = this.config;

    // Wenn keine Separatoren mehr, nach Zeichenanzahl splitten
    if (depth >= separators.length) {
      return this.splitByCharacter(text);
    }

    const separator = separators[depth];
    const splits = this.splitBySeparator(text, separator, keepSeparator!);

    const chunks: string[] = [];
    let currentChunk = "";

    for (const split of splits) {
      const potentialChunk = currentChunk + split;

      if (potentialChunk.length <= chunkSize) {
        currentChunk = potentialChunk;
      } else {
        // Aktuellen Chunk speichern wenn nicht leer
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }

        // Wenn Split selbst zu groß ist, rekursiv weiter splitten
        if (split.length > chunkSize) {
          const subChunks = this.splitRecursive(split, separators, depth + 1);
          chunks.push(...subChunks);
          currentChunk = "";
        } else {
          currentChunk = split;
        }
      }
    }

    // Letzten Chunk nicht vergessen
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Overlap hinzufügen
    return this.addOverlap(chunks);
  }

  /**
   * Splittet Text an einem Separator
   */
  private splitBySeparator(
    text: string,
    separator: string,
    keepSeparator: boolean
  ): string[] {
    if (separator === "") {
      return text.split("");
    }

    const parts = text.split(separator);

    if (!keepSeparator) {
      return parts;
    }

    // Separator an die Teile anhängen (außer am letzten)
    return parts.map((part, i) =>
      i < parts.length - 1 ? part + separator : part
    );
  }

  /**
   * Splittet nach fester Zeichenanzahl
   */
  private splitByCharacter(text: string): string[] {
    const { chunkSize } = this.config;
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    return this.addOverlap(chunks);
  }

  /**
   * Fügt Overlap zwischen Chunks hinzu
   */
  private addOverlap(chunks: string[]): string[] {
    const { chunkOverlap } = this.config;

    if (chunkOverlap <= 0 || chunks.length <= 1) {
      return chunks;
    }

    return chunks.map((chunk, index) => {
      if (index === 0) return chunk;

      const prevChunk = chunks[index - 1];
      const overlapText = prevChunk.slice(-chunkOverlap);

      return overlapText + chunk;
    });
  }

  /**
   * Findet die Startposition eines Chunks im Originaltext
   */
  private findStartPosition(
    originalText: string,
    chunkContent: string,
    chunkIndex: number
  ): number {
    // Vereinfachte Suche - findet erste Vorkommnis
    const position = originalText.indexOf(chunkContent);
    return position >= 0 ? position : 0;
  }
}

/**
 * Markdown-aware Chunker
 * Respektiert Markdown-Struktur beim Chunking
 */
export class MarkdownChunker extends RecursiveChunker {
  constructor(config: Partial<ChunkingConfig> = {}) {
    // Markdown-spezifische Separatoren
    const markdownSeparators = [
      "\n## ",     // H2 Headers
      "\n### ",   // H3 Headers
      "\n#### ",  // H4 Headers
      "\n\n",     // Paragraphs
      "\n",       // Lines
      ". ",       // Sentences
      " ",        // Words
      "",         // Characters
    ];

    super({
      ...config,
      separators: config.separators || markdownSeparators,
    });
  }
}
