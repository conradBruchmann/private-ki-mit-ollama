/**
 * Basis-Klasse für Document Loaders
 * Kapitel 9: RAG-Architekturen
 */

import { Document, LoaderConfig } from "../types.js";
import { randomUUID } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

export abstract class BaseLoader {
  protected config: LoaderConfig;

  constructor(config: LoaderConfig = {}) {
    this.config = {
      extractMetadata: true,
      encoding: "utf-8",
      ...config,
    };
  }

  /**
   * Lädt ein Dokument aus einer Datei
   */
  abstract load(filePath: string): Promise<Document[]>;

  /**
   * Prüft ob der Loader den Dateityp unterstützt
   */
  abstract supports(filePath: string): boolean;

  /**
   * Generiert eine eindeutige Dokument-ID
   */
  protected generateId(): string {
    return randomUUID();
  }

  /**
   * Liest eine Datei als Text
   */
  protected async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, { encoding: this.config.encoding });
  }

  /**
   * Liest eine Datei als Buffer
   */
  protected async readFileBuffer(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  /**
   * Extrahiert Basis-Metadaten aus dem Dateipfad
   */
  protected async getBaseMetadata(
    filePath: string
  ): Promise<Record<string, unknown>> {
    const stats = await fs.stat(filePath);
    const parsed = path.parse(filePath);

    return {
      source: filePath,
      filename: parsed.base,
      filetype: parsed.ext.slice(1).toLowerCase(),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      size: stats.size,
    };
  }
}
