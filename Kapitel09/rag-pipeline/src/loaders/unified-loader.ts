/**
 * Unified Document Loader - Automatische Formaterkennung
 * Kapitel 9: RAG-Architekturen
 */

import { BaseLoader } from "./base-loader.js";
import { Document, LoaderConfig } from "../types.js";
import { PDFLoader } from "./pdf-loader.js";
import { DocxLoader } from "./docx-loader.js";
import { MarkdownLoader } from "./markdown-loader.js";
import { TextLoader } from "./text-loader.js";
import { glob } from "glob";
import * as path from "path";

export class UnifiedLoader extends BaseLoader {
  private loaders: BaseLoader[];

  constructor(config: LoaderConfig = {}) {
    super(config);

    // Registrierte Loader in Prioritätsreihenfolge
    this.loaders = [
      new PDFLoader(config),
      new DocxLoader(config),
      new MarkdownLoader(config),
      new TextLoader(config),
    ];
  }

  supports(filePath: string): boolean {
    return this.loaders.some((loader) => loader.supports(filePath));
  }

  async load(filePath: string): Promise<Document[]> {
    const loader = this.getLoaderForFile(filePath);

    if (!loader) {
      throw new Error(`Kein Loader gefunden für: ${filePath}`);
    }

    return loader.load(filePath);
  }

  /**
   * Lädt alle Dokumente aus einem Verzeichnis
   */
  async loadDirectory(
    dirPath: string,
    pattern: string = "**/*"
  ): Promise<Document[]> {
    const files = await glob(pattern, {
      cwd: dirPath,
      nodir: true,
      absolute: true,
    });

    const documents: Document[] = [];

    for (const file of files) {
      if (this.supports(file)) {
        try {
          const docs = await this.load(file);
          documents.push(...docs);
          console.log(`✓ Geladen: ${path.basename(file)} (${docs.length} Dokument(e))`);
        } catch (error) {
          console.error(`✗ Fehler bei ${file}:`, error);
        }
      }
    }

    return documents;
  }

  /**
   * Lädt mehrere Dateien
   */
  async loadFiles(filePaths: string[]): Promise<Document[]> {
    const documents: Document[] = [];

    for (const filePath of filePaths) {
      if (this.supports(filePath)) {
        try {
          const docs = await this.load(filePath);
          documents.push(...docs);
        } catch (error) {
          console.error(`Fehler beim Laden von ${filePath}:`, error);
        }
      } else {
        console.warn(`Nicht unterstütztes Format: ${filePath}`);
      }
    }

    return documents;
  }

  /**
   * Findet den passenden Loader für eine Datei
   */
  private getLoaderForFile(filePath: string): BaseLoader | undefined {
    return this.loaders.find((loader) => loader.supports(filePath));
  }

  /**
   * Registriert einen zusätzlichen Loader
   */
  registerLoader(loader: BaseLoader): void {
    this.loaders.unshift(loader); // Am Anfang einfügen für Priorität
  }
}
