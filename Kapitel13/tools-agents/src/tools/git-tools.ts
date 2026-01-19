/**
 * Git-Tools
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import {
  BaseTool,
  createToolDefinition,
  successResult,
  errorResult,
  type ToolResult,
  type ToolDefinition
} from './types.js';

const execAsync = promisify(exec);

// ============================================================================
// Helper: Git Command ausführen
// ============================================================================

async function runGit(
  projectRoot: string,
  args: string,
  options: { maxBuffer?: number } = {}
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execAsync(`git ${args}`, {
      cwd: projectRoot,
      maxBuffer: options.maxBuffer ?? 1024 * 1024 * 5, // 5MB
      encoding: 'utf-8'
    });
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    if (execError.stdout || execError.stderr) {
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || ''
      };
    }
    throw error;
  }
}

// ============================================================================
// Git Status Tool
// ============================================================================

interface GitStatusInput {
  short?: boolean;
  branch?: boolean;
}

interface GitStatusOutput {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  clean: boolean;
  raw: string;
}

export class GitStatusTool extends BaseTool<GitStatusInput, GitStatusOutput> {
  name = 'git_status';
  description = 'Zeigt den Git-Status des Repositories';

  definition: ToolDefinition = createToolDefinition({
    name: 'git_status',
    description: 'Gibt den aktuellen Git-Status zurück (geänderte, neue, gelöschte Dateien)',
    properties: {
      short: {
        type: 'boolean',
        description: 'Kurzes Format'
      },
      branch: {
        type: 'boolean',
        description: 'Branch-Info anzeigen'
      }
    },
    required: []
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'git' });
  }

  async execute(input: GitStatusInput): Promise<ToolResult<GitStatusOutput>> {
    try {
      // Branch-Info abrufen
      const branchResult = await runGit(this.projectRoot, 'branch --show-current');
      const branch = branchResult.stdout.trim() || 'HEAD (detached)';

      // Status abrufen
      const statusResult = await runGit(
        this.projectRoot,
        'status --porcelain=v1 -b'
      );

      const lines = statusResult.stdout.split('\n').filter(Boolean);
      const staged: string[] = [];
      const unstaged: string[] = [];
      const untracked: string[] = [];
      let ahead = 0;
      let behind = 0;

      for (const line of lines) {
        // Branch-Info
        if (line.startsWith('## ')) {
          const aheadMatch = line.match(/ahead (\d+)/);
          const behindMatch = line.match(/behind (\d+)/);
          if (aheadMatch) ahead = parseInt(aheadMatch[1]);
          if (behindMatch) behind = parseInt(behindMatch[1]);
          continue;
        }

        const indexStatus = line[0];
        const workStatus = line[1];
        const file = line.slice(3);

        // Staged (Index)
        if (indexStatus !== ' ' && indexStatus !== '?') {
          staged.push(`${indexStatus} ${file}`);
        }

        // Unstaged (Working Tree)
        if (workStatus !== ' ' && workStatus !== '?') {
          unstaged.push(`${workStatus} ${file}`);
        }

        // Untracked
        if (indexStatus === '?' && workStatus === '?') {
          untracked.push(file);
        }
      }

      return successResult({
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        clean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0,
        raw: input.short ? statusResult.stdout : statusResult.stdout
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Git status failed: ${message}`);
    }
  }
}

// ============================================================================
// Git Diff Tool
// ============================================================================

interface GitDiffInput {
  file?: string;
  staged?: boolean;
  commit?: string;
  stat?: boolean;
}

interface GitDiffOutput {
  diff: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export class GitDiffTool extends BaseTool<GitDiffInput, GitDiffOutput> {
  name = 'git_diff';
  description = 'Zeigt Änderungen im Repository';

  definition: ToolDefinition = createToolDefinition({
    name: 'git_diff',
    description: 'Zeigt die Unterschiede zwischen Working Directory und HEAD oder zwischen Commits',
    properties: {
      file: {
        type: 'string',
        description: 'Optional: Nur Diff für diese Datei'
      },
      staged: {
        type: 'boolean',
        description: 'Zeige staged Änderungen statt unstaged'
      },
      commit: {
        type: 'string',
        description: 'Vergleiche mit diesem Commit (z.B. HEAD~1, main)'
      },
      stat: {
        type: 'boolean',
        description: 'Nur Statistiken anzeigen'
      }
    },
    required: []
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'git' });
  }

  async execute(input: GitDiffInput): Promise<ToolResult<GitDiffOutput>> {
    try {
      let cmd = 'diff';

      if (input.staged) cmd += ' --staged';
      if (input.commit) cmd += ` ${input.commit}`;
      if (input.stat) cmd += ' --stat';
      if (input.file) cmd += ` -- "${input.file}"`;

      const result = await runGit(this.projectRoot, cmd);

      // Statistiken parsen
      const statResult = await runGit(
        this.projectRoot,
        `diff ${input.staged ? '--staged' : ''} ${input.commit || ''} --shortstat`.trim()
      );

      let filesChanged = 0;
      let insertions = 0;
      let deletions = 0;

      const statMatch = statResult.stdout.match(
        /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/
      );
      if (statMatch) {
        filesChanged = parseInt(statMatch[1]) || 0;
        insertions = parseInt(statMatch[2]) || 0;
        deletions = parseInt(statMatch[3]) || 0;
      }

      // Diff kürzen wenn zu lang
      let diff = result.stdout.trim();
      if (diff.length > 50000) {
        diff = diff.slice(0, 50000) + '\n\n... [truncated, diff too large]';
      }

      return successResult({
        diff: diff || 'Keine Änderungen',
        filesChanged,
        insertions,
        deletions
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Git diff failed: ${message}`);
    }
  }
}

// ============================================================================
// Git Commit Tool
// ============================================================================

interface GitCommitInput {
  message: string;
  files?: string[];
  all?: boolean;
}

interface GitCommitOutput {
  committed: boolean;
  hash?: string;
  message: string;
  filesChanged: number;
  details: string;
}

export class GitCommitTool extends BaseTool<GitCommitInput, GitCommitOutput> {
  name = 'git_commit';
  description = 'Erstellt einen Git-Commit';

  definition: ToolDefinition = createToolDefinition({
    name: 'git_commit',
    description: 'Staged Änderungen committen. WICHTIG: Nur nach expliziter Bestätigung verwenden!',
    properties: {
      message: {
        type: 'string',
        description: 'Commit-Nachricht'
      },
      files: {
        type: 'array',
        description: 'Dateien zum Stagen (optional)',
        items: { type: 'string' }
      },
      all: {
        type: 'boolean',
        description: 'Alle geänderten Dateien stagen (-a)'
      }
    },
    required: ['message']
  });

  constructor(projectRoot: string) {
    super(projectRoot, {
      category: 'git',
      isDestructive: true,
      requiresConfirmation: true
    });
  }

  async execute(input: GitCommitInput): Promise<ToolResult<GitCommitOutput>> {
    try {
      // Dateien stagen
      if (input.files && input.files.length > 0) {
        for (const file of input.files) {
          await runGit(this.projectRoot, `add "${file}"`);
        }
      } else if (input.all) {
        await runGit(this.projectRoot, 'add -A');
      }

      // Prüfen ob es staged Changes gibt
      const statusResult = await runGit(this.projectRoot, 'diff --staged --shortstat');
      if (!statusResult.stdout.trim()) {
        return successResult({
          committed: false,
          message: 'Keine Änderungen zum Committen',
          filesChanged: 0,
          details: 'Nothing to commit'
        });
      }

      // Commit erstellen (Nachricht escapen)
      const escapedMessage = input.message.replace(/"/g, '\\"').replace(/`/g, '\\`');
      const result = await runGit(this.projectRoot, `commit -m "${escapedMessage}"`);

      // Hash extrahieren
      const hashMatch = result.stdout.match(/\[[\w-]+\s+([a-f0-9]+)\]/);
      const hash = hashMatch ? hashMatch[1] : undefined;

      // Änderungen zählen
      const filesMatch = result.stdout.match(/(\d+) files? changed/);
      const filesChanged = filesMatch ? parseInt(filesMatch[1]) : 0;

      return successResult({
        committed: true,
        hash,
        message: input.message,
        filesChanged,
        details: result.stdout.trim()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // "nothing to commit" ist kein echter Fehler
      if (message.includes('nothing to commit')) {
        return successResult({
          committed: false,
          message: 'Keine Änderungen zum Committen',
          filesChanged: 0,
          details: 'Working tree clean'
        });
      }

      return errorResult(`Git commit failed: ${message}`);
    }
  }
}

// ============================================================================
// Git Branch Tool
// ============================================================================

interface GitBranchInput {
  action: 'list' | 'create' | 'checkout' | 'delete';
  name?: string;
}

interface GitBranchOutput {
  action: string;
  branch?: string;
  branches?: string[];
  current?: string;
  details: string;
}

export class GitBranchTool extends BaseTool<GitBranchInput, GitBranchOutput> {
  name = 'git_branch';
  description = 'Verwaltet Git-Branches';

  definition: ToolDefinition = createToolDefinition({
    name: 'git_branch',
    description: 'Branch erstellen, wechseln oder auflisten',
    properties: {
      action: {
        type: 'string',
        description: 'Aktion: list, create, checkout, delete',
        enum: ['list', 'create', 'checkout', 'delete']
      },
      name: {
        type: 'string',
        description: 'Branch-Name (für create, checkout, delete)'
      }
    },
    required: ['action']
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'git' });
  }

  async execute(input: GitBranchInput): Promise<ToolResult<GitBranchOutput>> {
    try {
      switch (input.action) {
        case 'list': {
          const result = await runGit(this.projectRoot, 'branch -a');
          const lines = result.stdout.split('\n').filter(Boolean);
          const branches = lines.map(l => l.replace(/^\*?\s*/, '').trim());
          const currentMatch = lines.find(l => l.startsWith('*'));
          const current = currentMatch?.replace(/^\*\s*/, '').trim();

          return successResult({
            action: 'list',
            branches,
            current,
            details: result.stdout
          });
        }

        case 'create': {
          if (!input.name) {
            return errorResult('Branch-Name erforderlich');
          }
          const result = await runGit(this.projectRoot, `checkout -b ${input.name}`);
          return successResult({
            action: 'create',
            branch: input.name,
            details: result.stdout || result.stderr
          });
        }

        case 'checkout': {
          if (!input.name) {
            return errorResult('Branch-Name erforderlich');
          }
          const result = await runGit(this.projectRoot, `checkout ${input.name}`);
          return successResult({
            action: 'checkout',
            branch: input.name,
            details: result.stdout || result.stderr
          });
        }

        case 'delete': {
          if (!input.name) {
            return errorResult('Branch-Name erforderlich');
          }
          const result = await runGit(this.projectRoot, `branch -d ${input.name}`);
          return successResult({
            action: 'delete',
            branch: input.name,
            details: result.stdout || `Branch ${input.name} deleted`
          });
        }

        default:
          return errorResult(`Unbekannte Aktion: ${input.action}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Git branch failed: ${message}`);
    }
  }
}

// ============================================================================
// Git Log Tool
// ============================================================================

interface GitLogInput {
  count?: number;
  oneline?: boolean;
  file?: string;
}

interface GitLogEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
}

interface GitLogOutput {
  commits: GitLogEntry[];
  count: number;
}

export class GitLogTool extends BaseTool<GitLogInput, GitLogOutput> {
  name = 'git_log';
  description = 'Zeigt die Commit-Historie';

  definition: ToolDefinition = createToolDefinition({
    name: 'git_log',
    description: 'Zeigt die letzten Commits mit Details',
    properties: {
      count: {
        type: 'number',
        description: 'Anzahl der Commits (default: 10)'
      },
      oneline: {
        type: 'boolean',
        description: 'Kompaktes Format (eine Zeile pro Commit)'
      },
      file: {
        type: 'string',
        description: 'Nur Commits für diese Datei'
      }
    },
    required: []
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'git' });
  }

  async execute(input: GitLogInput): Promise<ToolResult<GitLogOutput>> {
    try {
      const count = input.count ?? 10;
      let cmd = `log -${count}`;
      cmd += ' --format="%H|%an|%ad|%s" --date=short';
      if (input.file) cmd += ` -- "${input.file}"`;

      const result = await runGit(this.projectRoot, cmd);

      const commits: GitLogEntry[] = result.stdout
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const [hash, author, date, ...messageParts] = line.split('|');
          return {
            hash: hash.slice(0, 8),
            author,
            date,
            message: messageParts.join('|')
          };
        });

      return successResult({
        commits,
        count: commits.length
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Git log failed: ${message}`);
    }
  }
}

// ============================================================================
// Export All Git Tools
// ============================================================================

export function createGitTools(projectRoot: string) {
  return [
    new GitStatusTool(projectRoot),
    new GitDiffTool(projectRoot),
    new GitCommitTool(projectRoot),
    new GitBranchTool(projectRoot),
    new GitLogTool(projectRoot)
  ];
}
