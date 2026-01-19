/**
 * FileSystem Tools
 * Kapitel 11: Architektur eines Programmierautomaten
 */

import { readFile, writeFile, mkdir, readdir, stat } from "fs/promises";
import { dirname, join, relative } from "path";
import { existsSync } from "fs";
import { Tool, ToolResult } from "./types.js";
import { glob } from "glob";

/**
 * Read File Tool
 */
export class ReadFileTool implements Tool {
  name = "read_file";
  description = "Liest den Inhalt einer Datei";

  definition = {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "Liest den Inhalt einer Datei und gibt ihn zurück",
      parameters: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description: "Pfad zur Datei (relativ zum Projekt)",
          },
        },
        required: ["path"],
      },
    },
  };

  constructor(private projectRoot: string) {}

  async execute(input: { path: string }): Promise<ToolResult> {
    const fullPath = this.resolvePath(input.path);

    // Security: Pfad darf nicht außerhalb des Projekts sein
    if (!fullPath.startsWith(this.projectRoot)) {
      return { success: false, error: "Path outside project directory" };
    }

    if (!existsSync(fullPath)) {
      return { success: false, error: `File not found: ${input.path}` };
    }

    try {
      const content = await readFile(fullPath, "utf-8");
      return {
        success: true,
        output: {
          path: input.path,
          content,
          size: content.length,
          lines: content.split("\n").length,
        },
      };
    } catch (error) {
      return { success: false, error: `Failed to read file: ${error}` };
    }
  }

  private resolvePath(path: string): string {
    return join(this.projectRoot, path);
  }
}

/**
 * Write File Tool
 */
export class WriteFileTool implements Tool {
  name = "write_file";
  description = "Schreibt Inhalt in eine Datei";

  definition = {
    type: "function" as const,
    function: {
      name: "write_file",
      description:
        "Schreibt Inhalt in eine Datei. Erstellt Verzeichnisse falls nötig.",
      parameters: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description: "Pfad zur Datei (relativ zum Projekt)",
          },
          content: {
            type: "string",
            description: "Inhalt der Datei",
          },
        },
        required: ["path", "content"],
      },
    },
  };

  constructor(
    private projectRoot: string,
    private allowNewFiles: boolean = true
  ) {}

  async execute(input: { path: string; content: string }): Promise<ToolResult> {
    const fullPath = this.resolvePath(input.path);

    // Security-Checks
    if (!fullPath.startsWith(this.projectRoot)) {
      return { success: false, error: "Path outside project directory" };
    }

    const isNewFile = !existsSync(fullPath);
    if (isNewFile && !this.allowNewFiles) {
      return { success: false, error: "Creating new files is not allowed" };
    }

    try {
      // Verzeichnis erstellen falls nötig
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, input.content, "utf-8");

      return {
        success: true,
        output: {
          path: input.path,
          size: input.content.length,
          created: isNewFile,
          lines: input.content.split("\n").length,
        },
      };
    } catch (error) {
      return { success: false, error: `Failed to write file: ${error}` };
    }
  }

  private resolvePath(path: string): string {
    return join(this.projectRoot, path);
  }
}

/**
 * List Files Tool
 */
export class ListFilesTool implements Tool {
  name = "list_files";
  description = "Listet Dateien in einem Verzeichnis";

  definition = {
    type: "function" as const,
    function: {
      name: "list_files",
      description: "Listet Dateien und Verzeichnisse auf",
      parameters: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description: "Verzeichnispfad (relativ zum Projekt, default: .)",
          },
          pattern: {
            type: "string",
            description: "Glob-Pattern zum Filtern (z.B. **/*.ts)",
          },
        },
        required: [],
      },
    },
  };

  constructor(private projectRoot: string) {}

  async execute(input: { path?: string; pattern?: string }): Promise<ToolResult> {
    const basePath = input.path
      ? join(this.projectRoot, input.path)
      : this.projectRoot;

    if (!basePath.startsWith(this.projectRoot)) {
      return { success: false, error: "Path outside project directory" };
    }

    try {
      if (input.pattern) {
        const files = await glob(input.pattern, {
          cwd: basePath,
          nodir: true,
        });
        return {
          success: true,
          output: {
            path: input.path || ".",
            pattern: input.pattern,
            files: files.slice(0, 100),
            total: files.length,
          },
        };
      }

      const entries = await readdir(basePath, { withFileTypes: true });
      const files = entries.map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "directory" : "file",
      }));

      return {
        success: true,
        output: {
          path: input.path || ".",
          entries: files,
        },
      };
    } catch (error) {
      return { success: false, error: `Failed to list files: ${error}` };
    }
  }
}

/**
 * Search Code Tool
 */
export class SearchCodeTool implements Tool {
  name = "search_code";
  description = "Durchsucht den Code nach einem Pattern";

  definition = {
    type: "function" as const,
    function: {
      name: "search_code",
      description: "Durchsucht Dateien nach einem Text-Pattern",
      parameters: {
        type: "object" as const,
        properties: {
          pattern: {
            type: "string",
            description: "Such-Pattern (Text oder Regex)",
          },
          filePattern: {
            type: "string",
            description: 'Glob-Pattern für Dateien (z.B. "**/*.ts")',
          },
          maxResults: {
            type: "number",
            description: "Maximale Anzahl Ergebnisse (default: 20)",
          },
        },
        required: ["pattern"],
      },
    },
  };

  constructor(private projectRoot: string) {}

  async execute(input: {
    pattern: string;
    filePattern?: string;
    maxResults?: number;
  }): Promise<ToolResult> {
    const maxResults = input.maxResults || 20;
    const filePattern = input.filePattern || "**/*.{ts,tsx,js,jsx,py,rs}";

    try {
      const files = await glob(filePattern, {
        cwd: this.projectRoot,
        nodir: true,
        ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
      });

      const results: Array<{
        file: string;
        line: number;
        content: string;
      }> = [];

      const regex = new RegExp(input.pattern, "gi");

      for (const file of files) {
        if (results.length >= maxResults) break;

        try {
          const content = await readFile(
            join(this.projectRoot, file),
            "utf-8"
          );
          const lines = content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) break;
            if (regex.test(lines[i])) {
              results.push({
                file,
                line: i + 1,
                content: lines[i].trim().slice(0, 200),
              });
            }
            regex.lastIndex = 0; // Reset regex
          }
        } catch {
          // Skip unreadable files
        }
      }

      return {
        success: true,
        output: {
          pattern: input.pattern,
          results,
          total: results.length,
        },
      };
    } catch (error) {
      return { success: false, error: `Search failed: ${error}` };
    }
  }
}
