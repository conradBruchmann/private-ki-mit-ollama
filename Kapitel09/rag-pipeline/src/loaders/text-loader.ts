/**
 * Plain Text Document Loader
 * Kapitel 9: RAG-Architekturen
 */

import { BaseLoader } from "./base-loader.js";
import { Document, DocumentMetadata } from "../types.js";

export class TextLoader extends BaseLoader {
  private supportedExtensions = [".txt", ".text", ".log", ".csv", ".json"];

  supports(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    return this.supportedExtensions.some((ext) => lower.endsWith(ext));
  }

  async load(filePath: string): Promise<Document[]> {
    const content = await this.readFile(filePath);
    const baseMetadata = await this.getBaseMetadata(filePath);

    const metadata: DocumentMetadata = {
      ...baseMetadata,
      source: filePath,
      filename: baseMetadata.filename as string,
      filetype: baseMetadata.filetype as string,
    };

    return [
      {
        id: this.generateId(),
        content: content.trim(),
        metadata,
      },
    ];
  }
}
