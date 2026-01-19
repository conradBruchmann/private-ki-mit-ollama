/**
 * Erweiterte Datei-Tools (List, Search, FindReplace)
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

import { readdir, stat, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import { glob } from 'glob';
import {
  BaseTool,
  createToolDefinition,
  successResult,
  errorResult,
  type ToolResult,
  type ToolDefinition
} from './types.js';

// ============================================================================
// List Directory Tool
// ============================================================================

interface ListDirInput {
  path?: string;
  recursive?: boolean;
  pattern?: string;
  maxDepth?: number;
  includeHidden?: boolean;
}

interface FileEntry {
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

interface ListDirOutput {
  directory: string;
  count: number;
  files: FileEntry[];
  truncated: boolean;
}

export class ListDirectoryTool extends BaseTool<ListDirInput, ListDirOutput> {
  name = 'list_directory';
  description = 'Listet Dateien und Ordner in einem Verzeichnis auf';

  definition: ToolDefinition = createToolDefinition({
    name: 'list_directory',
    description: 'Zeigt alle Dateien und Ordner in einem Verzeichnis. Kann rekursiv sein.',
    properties: {
      path: {
        type: 'string',
        description: 'Verzeichnispfad (relativ zum Projekt, default: Projektroot)'
      },
      recursive: {
        type: 'boolean',
        description: 'Rekursiv alle Unterordner einschließen'
      },
      pattern: {
        type: 'string',
        description: 'Glob-Pattern zum Filtern (z.B. "*.ts", "**/*.tsx")'
      },
      maxDepth: {
        type: 'number',
        description: 'Maximale Tiefe bei rekursiver Suche (default: 3)'
      },
      includeHidden: {
        type: 'boolean',
        description: 'Versteckte Dateien (.xyz) einschließen'
      }
    },
    required: []
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'filesystem' });
  }

  async execute(input: ListDirInput): Promise<ToolResult<ListDirOutput>> {
    const targetPath = resolve(this.projectRoot, input.path || '.');
    const maxDepth = input.maxDepth ?? 3;
    const includeHidden = input.includeHidden ?? false;

    if (!targetPath.startsWith(resolve(this.projectRoot))) {
      return errorResult('Access denied: Path outside project directory');
    }

    if (!existsSync(targetPath)) {
      return errorResult(`Directory not found: ${input.path || '.'}`);
    }

    try {
      let files: FileEntry[];

      if (input.pattern) {
        // Glob-basierte Suche
        const matches = await glob(input.pattern, {
          cwd: targetPath,
          dot: includeHidden,
          maxDepth: input.recursive ? maxDepth : 1,
          nodir: false
        });

        files = await Promise.all(
          matches.slice(0, 100).map(async (p) => {
            const fullPath = join(targetPath, p);
            try {
              const stats = await stat(fullPath);
              return {
                path: p,
                type: stats.isDirectory() ? 'directory' : 'file',
                size: stats.isFile() ? stats.size : undefined
              } as FileEntry;
            } catch {
              return { path: p, type: 'file' } as FileEntry;
            }
          })
        );
      } else {
        // Normale Verzeichnislistung
        files = await this.listFiles(
          targetPath,
          input.recursive ?? false,
          0,
          maxDepth,
          includeHidden
        );
      }

      const truncated = files.length >= 100;

      return successResult({
        directory: relative(this.projectRoot, targetPath) || '.',
        count: files.length,
        files: files.slice(0, 100),
        truncated
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Failed to list directory: ${message}`);
    }
  }

  private async listFiles(
    dir: string,
    recursive: boolean,
    depth: number,
    maxDepth: number,
    includeHidden: boolean
  ): Promise<FileEntry[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const result: FileEntry[] = [];

    // Ignorierte Verzeichnisse
    const ignored = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__'];

    for (const entry of entries) {
      // Versteckte Dateien
      if (!includeHidden && entry.name.startsWith('.')) continue;

      // Ignorierte Verzeichnisse
      if (entry.isDirectory() && ignored.includes(entry.name)) continue;

      const fullPath = join(dir, entry.name);
      const relativePath = relative(this.projectRoot, fullPath);

      if (entry.isDirectory()) {
        result.push({ path: relativePath, type: 'directory' });

        if (recursive && depth < maxDepth && result.length < 100) {
          const subFiles = await this.listFiles(
            fullPath,
            true,
            depth + 1,
            maxDepth,
            includeHidden
          );
          result.push(...subFiles);
        }
      } else if (entry.isFile()) {
        try {
          const stats = await stat(fullPath);
          result.push({
            path: relativePath,
            type: 'file',
            size: stats.size
          });
        } catch {
          result.push({ path: relativePath, type: 'file' });
        }
      }

      if (result.length >= 100) break;
    }

    return result;
  }
}

// ============================================================================
// Search Code Tool
// ============================================================================

interface SearchCodeInput {
  pattern: string;
  path?: string;
  filePattern?: string;
  caseSensitive?: boolean;
  maxResults?: number;
  contextLines?: number;
}

interface SearchMatch {
  file: string;
  line: number;
  column: number;
  content: string;
  context?: {
    before: string[];
    after: string[];
  };
}

interface SearchCodeOutput {
  pattern: string;
  matchCount: number;
  fileCount: number;
  matches: SearchMatch[];
  truncated: boolean;
}

export class SearchCodeTool extends BaseTool<SearchCodeInput, SearchCodeOutput> {
  name = 'search_code';
  description = 'Durchsucht Code-Dateien nach einem Pattern';

  definition: ToolDefinition = createToolDefinition({
    name: 'search_code',
    description: 'Sucht nach Text oder Regex in Code-Dateien. Gibt Treffer mit Kontext zurück.',
    properties: {
      pattern: {
        type: 'string',
        description: 'Suchbegriff oder Regex'
      },
      path: {
        type: 'string',
        description: 'Suchverzeichnis (relativ zum Projekt)'
      },
      filePattern: {
        type: 'string',
        description: 'Glob-Pattern für Dateien (z.B. "*.ts", "src/**/*.tsx")'
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Groß-/Kleinschreibung beachten (default: false)'
      },
      maxResults: {
        type: 'number',
        description: 'Maximale Anzahl Treffer (default: 50)'
      },
      contextLines: {
        type: 'number',
        description: 'Zeilen Kontext vor/nach Treffer (default: 0)'
      }
    },
    required: ['pattern']
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'analysis' });
  }

  async execute(input: SearchCodeInput): Promise<ToolResult<SearchCodeOutput>> {
    const searchPath = resolve(this.projectRoot, input.path || '.');
    const maxResults = input.maxResults ?? 50;
    const contextLines = input.contextLines ?? 0;

    if (!searchPath.startsWith(resolve(this.projectRoot))) {
      return errorResult('Access denied: Path outside project directory');
    }

    try {
      // Dateien finden
      const defaultPattern = '**/*.{ts,tsx,js,jsx,py,rs,go,java,c,cpp,h,hpp,md,json,yaml,yml}';
      const filePattern = input.filePattern || defaultPattern;

      const files = await glob(filePattern, {
        cwd: searchPath,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
        nodir: true
      });

      // Regex erstellen
      const flags = input.caseSensitive ? 'g' : 'gi';
      let regex: RegExp;
      try {
        regex = new RegExp(input.pattern, flags);
      } catch {
        // Falls kein gültiger Regex, als Literal suchen
        const escaped = input.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, flags);
      }

      const matches: SearchMatch[] = [];
      const filesWithMatches = new Set<string>();

      for (const file of files) {
        if (matches.length >= maxResults) break;

        const fullPath = join(searchPath, file);
        try {
          const content = await readFile(fullPath, 'utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match;

            while ((match = regex.exec(line)) !== null) {
              if (matches.length >= maxResults) break;

              filesWithMatches.add(file);

              const searchMatch: SearchMatch = {
                file,
                line: i + 1,
                column: match.index + 1,
                content: line.trim().slice(0, 200)
              };

              // Kontext hinzufügen
              if (contextLines > 0) {
                searchMatch.context = {
                  before: lines
                    .slice(Math.max(0, i - contextLines), i)
                    .map(l => l.trim().slice(0, 200)),
                  after: lines
                    .slice(i + 1, i + 1 + contextLines)
                    .map(l => l.trim().slice(0, 200))
                };
              }

              matches.push(searchMatch);

              // Prevent infinite loop on empty matches
              if (match[0].length === 0) break;
            }
          }
        } catch {
          // Datei überspringen (z.B. Binärdatei)
        }
      }

      return successResult({
        pattern: input.pattern,
        matchCount: matches.length,
        fileCount: filesWithMatches.size,
        matches,
        truncated: matches.length >= maxResults
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Search failed: ${message}`);
    }
  }
}

// ============================================================================
// Find Replace Tool (Multi-File)
// ============================================================================

interface FindReplaceInput {
  find: string;
  replace: string;
  filePattern: string;
  path?: string;
  regex?: boolean;
  dryRun?: boolean;
}

interface FileChange {
  file: string;
  replacements: number;
}

interface FindReplaceOutput {
  filesChanged: number;
  totalReplacements: number;
  changes: FileChange[];
  dryRun: boolean;
}

export class FindReplaceTool extends BaseTool<FindReplaceInput, FindReplaceOutput> {
  name = 'find_replace';
  description = 'Sucht und ersetzt Text in mehreren Dateien';

  definition: ToolDefinition = createToolDefinition({
    name: 'find_replace',
    description: 'Ersetzt Text in mehreren Dateien. Unterstützt Glob-Patterns und Regex.',
    properties: {
      find: {
        type: 'string',
        description: 'Zu suchender Text oder Regex'
      },
      replace: {
        type: 'string',
        description: 'Ersetzungstext'
      },
      filePattern: {
        type: 'string',
        description: 'Glob-Pattern für Dateien (z.B. "src/**/*.ts")'
      },
      path: {
        type: 'string',
        description: 'Basisverzeichnis für die Suche'
      },
      regex: {
        type: 'boolean',
        description: 'Als Regex interpretieren (default: false)'
      },
      dryRun: {
        type: 'boolean',
        description: 'Nur anzeigen, nicht ändern (default: false)'
      }
    },
    required: ['find', 'replace', 'filePattern']
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'filesystem', isDestructive: true });
  }

  async execute(input: FindReplaceInput): Promise<ToolResult<FindReplaceOutput>> {
    const { writeFile } = await import('fs/promises');
    const basePath = resolve(this.projectRoot, input.path || '.');

    if (!basePath.startsWith(resolve(this.projectRoot))) {
      return errorResult('Access denied: Path outside project directory');
    }

    try {
      const files = await glob(input.filePattern, {
        cwd: basePath,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
        nodir: true
      });

      // Pattern erstellen
      const pattern = input.regex
        ? new RegExp(input.find, 'g')
        : new RegExp(input.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

      const changes: FileChange[] = [];

      for (const file of files) {
        const fullPath = join(basePath, file);
        try {
          const content = await readFile(fullPath, 'utf-8');
          const matches = content.match(pattern);

          if (matches && matches.length > 0) {
            if (!input.dryRun) {
              const newContent = content.replace(pattern, input.replace);
              await writeFile(fullPath, newContent, 'utf-8');
            }

            changes.push({
              file,
              replacements: matches.length
            });
          }
        } catch {
          // Datei überspringen
        }
      }

      return successResult({
        filesChanged: changes.length,
        totalReplacements: changes.reduce((a, b) => a + b.replacements, 0),
        changes: changes.slice(0, 50),
        dryRun: input.dryRun ?? false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Find/Replace failed: ${message}`);
    }
  }
}

// ============================================================================
// Export All Advanced File Tools
// ============================================================================

export function createAdvancedFileTools(projectRoot: string) {
  return [
    new ListDirectoryTool(projectRoot),
    new SearchCodeTool(projectRoot),
    new FindReplaceTool(projectRoot)
  ];
}
