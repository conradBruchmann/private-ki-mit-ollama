/**
 * Markdown Document Loader mit Frontmatter-Support
 * Kapitel 9: RAG-Architekturen
 */

import { BaseLoader } from "./base-loader.js";
import { Document, DocumentMetadata, LoaderConfig } from "../types.js";
import matter from "gray-matter";

interface MarkdownLoaderConfig extends LoaderConfig {
  parseFrontmatter?: boolean;
  removeFrontmatter?: boolean;
}

export class MarkdownLoader extends BaseLoader {
  private parseFrontmatter: boolean;
  private removeFrontmatter: boolean;

  constructor(config: MarkdownLoaderConfig = {}) {
    super(config);
    this.parseFrontmatter = config.parseFrontmatter ?? true;
    this.removeFrontmatter = config.removeFrontmatter ?? true;
  }

  supports(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    return lower.endsWith(".md") || lower.endsWith(".markdown");
  }

  async load(filePath: string): Promise<Document[]> {
    const content = await this.readFile(filePath);
    const baseMetadata = await this.getBaseMetadata(filePath);

    let documentContent = content;
    let frontmatterData: Record<string, unknown> = {};

    // Frontmatter parsen
    if (this.parseFrontmatter) {
      try {
        const parsed = matter(content);
        frontmatterData = parsed.data;

        if (this.removeFrontmatter) {
          documentContent = parsed.content;
        }
      } catch (error) {
        console.warn(`Frontmatter-Parsing fehlgeschlagen für ${filePath}:`, error);
      }
    }

    const metadata: DocumentMetadata = {
      ...baseMetadata,
      source: filePath,
      filename: baseMetadata.filename as string,
      filetype: "markdown",
      title: frontmatterData.title as string | undefined,
      author: frontmatterData.author as string | undefined,
      date: frontmatterData.date as string | undefined,
      tags: frontmatterData.tags as string[] | undefined,
      ...frontmatterData,
    };

    return [
      {
        id: this.generateId(),
        content: documentContent.trim(),
        metadata,
      },
    ];
  }
}
