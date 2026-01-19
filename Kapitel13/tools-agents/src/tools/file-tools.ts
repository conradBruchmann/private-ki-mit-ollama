/**
 * Basis Datei-Tools
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import {
  BaseTool,
  createToolDefinition,
  successResult,
  errorResult,
  type ToolResult,
  type ToolDefinition
} from './types.js';

// ============================================================================
// Read File Tool
// ============================================================================

interface ReadFileInput {
  path: string;
  encoding?: 'utf-8' | 'base64';
  startLine?: number;
  endLine?: number;
}

interface ReadFileOutput {
  content: string;
  path: string;
  lines: number;
  size: number;
  truncated: boolean;
}

export class ReadFileTool extends BaseTool<ReadFileInput, ReadFileOutput> {
  name = 'read_file';
  description = 'Liest den Inhalt einer Datei aus dem Dateisystem';

  definition: ToolDefinition = createToolDefinition({
    name: 'read_file',
    description: 'Liest den Inhalt einer Datei. Bei großen Dateien kann ein Zeilenbereich angegeben werden.',
    properties: {
      path: {
        type: 'string',
        description: 'Der Pfad zur Datei (relativ zum Projektverzeichnis)'
      },
      encoding: {
        type: 'string',
        description: 'Encoding: utf-8 (Text) oder base64 (Binär)',
        enum: ['utf-8', 'base64']
      },
      startLine: {
        type: 'number',
        description: 'Erste Zeile (1-basiert), für große Dateien'
      },
      endLine: {
        type: 'number',
        description: 'Letzte Zeile (1-basiert), für große Dateien'
      }
    },
    required: ['path']
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'filesystem' });
  }

  async execute(input: ReadFileInput): Promise<ToolResult<ReadFileOutput>> {
    const fullPath = resolve(this.projectRoot, input.path);

    // Sicherheitsprüfung: Pfad muss im Projekt sein
    if (!fullPath.startsWith(resolve(this.projectRoot))) {
      return errorResult('Access denied: Path outside project directory');
    }

    if (!existsSync(fullPath)) {
      return errorResult(`File not found: ${input.path}`);
    }

    try {
      const encoding = input.encoding || 'utf-8';
      let content = await readFile(fullPath, encoding === 'base64' ? 'base64' : 'utf-8');

      const stats = { size: Buffer.byteLength(content), lines: 0, truncated: false };

      // Zeilenfilterung für utf-8
      if (encoding === 'utf-8') {
        const lines = content.split('\n');
        stats.lines = lines.length;

        if (input.startLine || input.endLine) {
          const start = Math.max(1, input.startLine || 1) - 1;
          const end = input.endLine || lines.length;
          content = lines.slice(start, end).join('\n');
          stats.truncated = start > 0 || end < lines.length;
        }

        // Limit für sehr große Dateien (100KB)
        if (content.length > 100000) {
          content = content.slice(0, 100000) + '\n... [truncated]';
          stats.truncated = true;
        }
      }

      return successResult({
        content,
        path: input.path,
        lines: stats.lines,
        size: stats.size,
        truncated: stats.truncated
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Failed to read file: ${message}`);
    }
  }
}

// ============================================================================
// Write File Tool
// ============================================================================

interface WriteFileInput {
  path: string;
  content: string;
  createDirs?: boolean;
  backup?: boolean;
}

interface WriteFileOutput {
  path: string;
  bytes: number;
  created: boolean;
  backupPath?: string;
}

export class WriteFileTool extends BaseTool<WriteFileInput, WriteFileOutput> {
  name = 'write_file';
  description = 'Schreibt Inhalt in eine Datei (erstellt oder überschreibt)';

  definition: ToolDefinition = createToolDefinition({
    name: 'write_file',
    description: 'Schreibt Inhalt in eine Datei. Erstellt die Datei falls sie nicht existiert.',
    properties: {
      path: {
        type: 'string',
        description: 'Der Pfad zur Datei (relativ zum Projektverzeichnis)'
      },
      content: {
        type: 'string',
        description: 'Der zu schreibende Inhalt'
      },
      createDirs: {
        type: 'boolean',
        description: 'Übergeordnete Verzeichnisse erstellen falls nötig'
      },
      backup: {
        type: 'boolean',
        description: 'Backup der existierenden Datei erstellen'
      }
    },
    required: ['path', 'content']
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'filesystem', isDestructive: true });
  }

  async execute(input: WriteFileInput): Promise<ToolResult<WriteFileOutput>> {
    const fullPath = resolve(this.projectRoot, input.path);

    // Sicherheitsprüfung
    if (!fullPath.startsWith(resolve(this.projectRoot))) {
      return errorResult('Access denied: Path outside project directory');
    }

    try {
      const existed = existsSync(fullPath);
      let backupPath: string | undefined;

      // Verzeichnis erstellen falls nötig
      if (input.createDirs !== false) {
        await mkdir(dirname(fullPath), { recursive: true });
      }

      // Backup erstellen
      if (input.backup && existed) {
        backupPath = `${fullPath}.backup.${Date.now()}`;
        const existing = await readFile(fullPath, 'utf-8');
        await writeFile(backupPath, existing, 'utf-8');
      }

      // Datei schreiben
      await writeFile(fullPath, input.content, 'utf-8');

      return successResult({
        path: input.path,
        bytes: Buffer.byteLength(input.content, 'utf-8'),
        created: !existed,
        backupPath: backupPath ? relative(this.projectRoot, backupPath) : undefined
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Failed to write file: ${message}`);
    }
  }
}

// ============================================================================
// Patch File Tool (für gezielte Änderungen)
// ============================================================================

interface PatchFileInput {
  path: string;
  find: string;
  replace: string;
  all?: boolean;
}

interface PatchFileOutput {
  path: string;
  replacements: number;
  newContent: string;
}

export class PatchFileTool extends BaseTool<PatchFileInput, PatchFileOutput> {
  name = 'patch_file';
  description = 'Ersetzt Text in einer Datei (find & replace)';

  definition: ToolDefinition = createToolDefinition({
    name: 'patch_file',
    description: 'Sucht und ersetzt Text in einer Datei. Nützlich für gezielte Änderungen.',
    properties: {
      path: {
        type: 'string',
        description: 'Der Pfad zur Datei'
      },
      find: {
        type: 'string',
        description: 'Der zu suchende Text (exakter Match)'
      },
      replace: {
        type: 'string',
        description: 'Der Ersetzungstext'
      },
      all: {
        type: 'boolean',
        description: 'Alle Vorkommen ersetzen (default: false, nur erstes)'
      }
    },
    required: ['path', 'find', 'replace']
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'filesystem', isDestructive: true });
  }

  async execute(input: PatchFileInput): Promise<ToolResult<PatchFileOutput>> {
    const fullPath = resolve(this.projectRoot, input.path);

    if (!fullPath.startsWith(resolve(this.projectRoot))) {
      return errorResult('Access denied: Path outside project directory');
    }

    if (!existsSync(fullPath)) {
      return errorResult(`File not found: ${input.path}`);
    }

    try {
      let content = await readFile(fullPath, 'utf-8');
      let replacements = 0;

      // Escape für exakten Match
      const escaped = input.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, input.all ? 'g' : '');

      const matches = content.match(new RegExp(escaped, 'g'));
      if (!matches) {
        return errorResult(`Text not found in file: "${input.find.slice(0, 50)}..."`);
      }

      replacements = input.all ? matches.length : 1;
      content = content.replace(regex, input.replace);

      await writeFile(fullPath, content, 'utf-8');

      return successResult({
        path: input.path,
        replacements,
        newContent: content.length > 5000 ? content.slice(0, 5000) + '...' : content
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Failed to patch file: ${message}`);
    }
  }
}

// ============================================================================
// Delete File Tool
// ============================================================================

interface DeleteFileInput {
  path: string;
}

interface DeleteFileOutput {
  path: string;
  deleted: boolean;
}

export class DeleteFileTool extends BaseTool<DeleteFileInput, DeleteFileOutput> {
  name = 'delete_file';
  description = 'Löscht eine Datei aus dem Dateisystem';

  definition: ToolDefinition = createToolDefinition({
    name: 'delete_file',
    description: 'Löscht eine Datei. VORSICHT: Kann nicht rückgängig gemacht werden!',
    properties: {
      path: {
        type: 'string',
        description: 'Der Pfad zur zu löschenden Datei'
      }
    },
    required: ['path']
  });

  constructor(projectRoot: string) {
    super(projectRoot, {
      category: 'filesystem',
      isDestructive: true,
      requiresConfirmation: true
    });
  }

  async execute(input: DeleteFileInput): Promise<ToolResult<DeleteFileOutput>> {
    const { unlink } = await import('fs/promises');
    const fullPath = resolve(this.projectRoot, input.path);

    if (!fullPath.startsWith(resolve(this.projectRoot))) {
      return errorResult('Access denied: Path outside project directory');
    }

    if (!existsSync(fullPath)) {
      return successResult({ path: input.path, deleted: false });
    }

    try {
      await unlink(fullPath);
      return successResult({ path: input.path, deleted: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Failed to delete file: ${message}`);
    }
  }
}

// ============================================================================
// Export All File Tools
// ============================================================================

export function createFileTools(projectRoot: string) {
  return [
    new ReadFileTool(projectRoot),
    new WriteFileTool(projectRoot),
    new PatchFileTool(projectRoot),
    new DeleteFileTool(projectRoot)
  ];
}
