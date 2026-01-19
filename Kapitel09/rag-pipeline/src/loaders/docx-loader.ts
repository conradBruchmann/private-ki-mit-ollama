/**
 * DOCX Document Loader
 * Kapitel 9: RAG-Architekturen
 */

import { BaseLoader } from "./base-loader.js";
import { Document, DocumentMetadata, LoaderConfig } from "../types.js";
import mammoth from "mammoth";

interface DocxLoaderConfig extends LoaderConfig {
  preserveStyles?: boolean;
  extractImages?: boolean;
}

export class DocxLoader extends BaseLoader {
  private preserveStyles: boolean;

  constructor(config: DocxLoaderConfig = {}) {
    super(config);
    this.preserveStyles = config.preserveStyles ?? false;
  }

  supports(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    return lower.endsWith(".docx") || lower.endsWith(".doc");
  }

  async load(filePath: string): Promise<Document[]> {
    const buffer = await this.readFileBuffer(filePath);
    const baseMetadata = await this.getBaseMetadata(filePath);

    // Mammoth-Optionen
    const options = this.preserveStyles
      ? {}
      : {
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
          ],
        };

    const result = await mammoth.extractRawText({ buffer });

    // Warnungen protokollieren (optional)
    if (result.messages.length > 0) {
      console.warn(
        `DOCX Loader Warnungen für ${filePath}:`,
        result.messages.map((m) => m.message).join(", ")
      );
    }

    const metadata: DocumentMetadata = {
      ...baseMetadata,
      source: filePath,
      filename: baseMetadata.filename as string,
      filetype: "docx",
    };

    return [
      {
        id: this.generateId(),
        content: result.value.trim(),
        metadata,
      },
    ];
  }
}
