/**
 * PDF Document Loader
 * Kapitel 9: RAG-Architekturen
 */

import { BaseLoader } from "./base-loader.js";
import { Document, DocumentMetadata, LoaderConfig } from "../types.js";
import pdfParse from "pdf-parse";

interface PDFLoaderConfig extends LoaderConfig {
  splitPages?: boolean;
}

export class PDFLoader extends BaseLoader {
  private splitPages: boolean;

  constructor(config: PDFLoaderConfig = {}) {
    super(config);
    this.splitPages = config.splitPages ?? true;
  }

  supports(filePath: string): boolean {
    return filePath.toLowerCase().endsWith(".pdf");
  }

  async load(filePath: string): Promise<Document[]> {
    const buffer = await this.readFileBuffer(filePath);
    const baseMetadata = await this.getBaseMetadata(filePath);

    const data = await pdfParse(buffer, {
      pagerender: this.splitPages ? undefined : () => "",
    });

    const metadata: DocumentMetadata = {
      ...baseMetadata,
      source: filePath,
      filename: baseMetadata.filename as string,
      filetype: "pdf",
      title: data.info?.Title || undefined,
      author: data.info?.Author || undefined,
      pageCount: data.numpages,
      pdfVersion: data.info?.PDFFormatVersion,
    };

    // Wenn Pages gesplittet werden sollen
    if (this.splitPages && data.text) {
      // PDF-parse gibt den Text seitenweise zurück, getrennt durch Form Feed
      const pages = this.splitIntoPages(data.text);

      return pages.map((pageContent, index) => ({
        id: this.generateId(),
        content: pageContent.trim(),
        metadata: {
          ...metadata,
          pageNumber: index + 1,
        },
      }));
    }

    // Gesamtes Dokument als ein Document
    return [
      {
        id: this.generateId(),
        content: data.text.trim(),
        metadata,
      },
    ];
  }

  /**
   * Splittet PDF-Text in Seiten
   * PDF-parse trennt Seiten oft durch mehrere Newlines
   */
  private splitIntoPages(text: string): string[] {
    // Form Feed Character oder mehrere Newlines als Seitentrenner
    const pages = text.split(/\f|\n{4,}/);
    return pages.filter((page) => page.trim().length > 0);
  }
}
