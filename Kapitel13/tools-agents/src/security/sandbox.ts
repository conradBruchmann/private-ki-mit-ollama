/**
 * Security Sandbox
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 *
 * Schützt vor gefährlichen Operationen durch:
 * - Pfad-Validierung (keine Zugriffe außerhalb des Projekts)
 * - Command-Whitelist (nur erlaubte Befehle)
 * - Pattern-Blacklist (keine sensitiven Dateien)
 * - Größenlimits (keine riesigen Dateien)
 */

import { resolve, relative } from 'path';
import type { Tool, ToolResult } from '../tools/types.js';

// ============================================================================
// Configuration
// ============================================================================

export interface SandboxConfig {
  /** Projekt-Wurzelverzeichnis */
  projectRoot: string;
  /** Erlaubte Pfade (default: nur projectRoot) */
  allowedPaths?: string[];
  /** Blockierte Pfad-Patterns */
  blockedPatterns?: RegExp[];
  /** Maximale Dateigröße in Bytes */
  maxFileSize?: number;
  /** Erlaubte Shell-Befehle */
  allowedCommands?: string[];
  /** Read-Only Modus */
  readOnly?: boolean;
  /** Audit-Logging */
  enableAudit?: boolean;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

export interface AuditEntry {
  timestamp: Date;
  tool: string;
  operation: 'read' | 'write' | 'execute' | 'delete';
  path?: string;
  command?: string;
  allowed: boolean;
  reason?: string;
}

// ============================================================================
// Sandbox Implementation
// ============================================================================

export class Sandbox {
  private config: Required<Omit<SandboxConfig, 'projectRoot'>> & { projectRoot: string };
  private auditLog: AuditEntry[] = [];

  constructor(config: SandboxConfig) {
    this.config = {
      projectRoot: resolve(config.projectRoot),
      allowedPaths: config.allowedPaths || [config.projectRoot],
      blockedPatterns: config.blockedPatterns || this.defaultBlockedPatterns(),
      maxFileSize: config.maxFileSize || 1024 * 1024, // 1MB
      allowedCommands: config.allowedCommands || this.defaultAllowedCommands(),
      readOnly: config.readOnly || false,
      enableAudit: config.enableAudit || false
    };
  }

  /**
   * Standard-blockierte Patterns
   */
  private defaultBlockedPatterns(): RegExp[] {
    return [
      /\.env/i,                    // Environment files
      /credentials/i,             // Credentials
      /secrets?/i,                // Secrets
      /\.git\/(?!config)/,        // Git internals (außer config)
      /node_modules/,             // Dependencies
      /password/i,                // Password files
      /\.pem$/i,                  // Keys
      /\.key$/i,                  // Keys
      /id_rsa/i,                  // SSH keys
      /\.ssh/,                    // SSH directory
      /\.aws/,                    // AWS credentials
      /\.kube/,                   // Kubernetes
    ];
  }

  /**
   * Standard-erlaubte Befehle
   */
  private defaultAllowedCommands(): string[] {
    return [
      'npm', 'npx', 'node', 'yarn', 'pnpm', 'bun',
      'tsc', 'eslint', 'prettier', 'biome',
      'jest', 'vitest', 'mocha', 'pytest',
      'cargo', 'rustc', 'clippy',
      'git', 'gh',
      'cat', 'ls', 'pwd', 'echo', 'grep', 'find',
      'curl', 'wget' // Mit Vorsicht
    ];
  }

  /**
   * Pfad validieren
   */
  validatePath(path: string): ValidationResult {
    const fullPath = resolve(this.config.projectRoot, path);
    const normalizedPath = fullPath.toLowerCase();

    // 1. Pfad muss innerhalb erlaubter Bereiche sein
    const isInAllowed = this.config.allowedPaths.some(allowed => {
      const resolvedAllowed = resolve(allowed);
      return fullPath.startsWith(resolvedAllowed);
    });

    if (!isInAllowed) {
      return {
        allowed: false,
        reason: `Path outside allowed directories: ${path}`
      };
    }

    // 2. Blockierte Patterns prüfen
    for (const pattern of this.config.blockedPatterns) {
      if (pattern.test(path) || pattern.test(normalizedPath)) {
        return {
          allowed: false,
          reason: `Path matches blocked pattern: ${pattern}`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Shell-Befehl validieren
   */
  validateCommand(command: string): ValidationResult {
    // Basis-Befehl extrahieren
    const parts = command.trim().split(/\s+/);
    const baseCommand = parts[0];

    // 1. Whitelist prüfen
    if (!this.config.allowedCommands.includes(baseCommand)) {
      return {
        allowed: false,
        reason: `Command not in whitelist: ${baseCommand}`
      };
    }

    // 2. Gefährliche Patterns prüfen
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,           // rm -rf /
      /rm\s+-rf\s+~/,            // rm -rf ~
      />\s*\/dev/,               // > /dev/...
      /\|\s*sh\b/,               // | sh
      /\|\s*bash\b/,             // | bash
      /curl.*\|\s*(sh|bash)/,    // curl | sh
      /wget.*\|\s*(sh|bash)/,    // wget | sh
      /sudo\b/,                  // sudo
      /chmod\s+777/,             // chmod 777
      /chown\s+root/,            // chown root
      /mkfs/,                    // Filesystem operations
      /dd\s+if=/,                // dd
      /:\(\)\{/,                 // Fork bomb
      />\s*\/etc/,               // Write to /etc
      /;\s*rm\s/,                // ; rm (injection)
      /`.*`/,                    // Command substitution
      /\$\(/,                    // $(command)
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: `Dangerous command pattern detected: ${pattern}`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Schreib-Operation validieren
   */
  validateWrite(path: string, content: string): ValidationResult {
    // Read-Only Modus
    if (this.config.readOnly) {
      return {
        allowed: false,
        reason: 'Sandbox is in read-only mode'
      };
    }

    // Pfad prüfen
    const pathCheck = this.validatePath(path);
    if (!pathCheck.allowed) {
      return pathCheck;
    }

    // Größe prüfen
    const size = Buffer.byteLength(content, 'utf-8');
    if (size > this.config.maxFileSize) {
      return {
        allowed: false,
        reason: `Content exceeds max size (${this.config.maxFileSize} bytes)`
      };
    }

    // Gefährliche Inhalte prüfen
    const dangerousContent = [
      /eval\s*\(/,               // eval()
      /<script/i,               // Script tags
      /process\.env/,           // Environment access (in config files)
    ];

    // Nur für bestimmte Dateitypen
    if (path.match(/\.(js|ts|jsx|tsx)$/)) {
      for (const pattern of dangerousContent) {
        if (pattern.test(content)) {
          // Warnung, aber nicht blockieren (könnte legitim sein)
          console.warn(`Warning: Content contains potentially dangerous pattern: ${pattern}`);
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Audit-Log hinzufügen
   */
  private audit(entry: Omit<AuditEntry, 'timestamp'>): void {
    if (this.config.enableAudit) {
      this.auditLog.push({
        ...entry,
        timestamp: new Date()
      });
    }
  }

  /**
   * Audit-Log abrufen
   */
  getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Audit-Log leeren
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Tool mit Sandbox wrappen
   */
  wrapTool<T extends Tool>(tool: T): T {
    const sandbox = this;

    return new Proxy(tool, {
      get(target, prop) {
        if (prop === 'execute') {
          return async function(input: Record<string, unknown>): Promise<ToolResult> {
            // Pfad-basierte Validierung
            if ('path' in input && typeof input.path === 'string') {
              const check = sandbox.validatePath(input.path);

              sandbox.audit({
                tool: target.name,
                operation: 'content' in input ? 'write' : 'read',
                path: input.path,
                allowed: check.allowed,
                reason: check.reason
              });

              if (!check.allowed) {
                return { success: false, error: check.reason };
              }
            }

            // Command-basierte Validierung
            if ('command' in input && typeof input.command === 'string') {
              const check = sandbox.validateCommand(input.command);

              sandbox.audit({
                tool: target.name,
                operation: 'execute',
                command: input.command,
                allowed: check.allowed,
                reason: check.reason
              });

              if (!check.allowed) {
                return { success: false, error: check.reason };
              }
            }

            // Write-Validierung
            if ('content' in input && 'path' in input) {
              const check = sandbox.validateWrite(
                input.path as string,
                input.content as string
              );

              if (!check.allowed) {
                return { success: false, error: check.reason };
              }
            }

            // Tool ausführen
            return target.execute(input);
          };
        }
        return (target as Record<string, unknown>)[prop as string];
      }
    }) as T;
  }

  /**
   * Alle Tools in einer Registry wrappen
   */
  wrapRegistry(registry: import('../tools/registry.js').ToolRegistry): void {
    for (const name of registry.list()) {
      const tool = registry.get(name);
      if (tool) {
        const wrapped = this.wrapTool(tool);
        registry.register(wrapped);
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Standard-Sandbox erstellen
 */
export function createSandbox(projectRoot: string, options: Partial<SandboxConfig> = {}): Sandbox {
  return new Sandbox({
    projectRoot,
    ...options
  });
}

/**
 * Strenge Sandbox (Read-Only)
 */
export function createStrictSandbox(projectRoot: string): Sandbox {
  return new Sandbox({
    projectRoot,
    readOnly: true,
    enableAudit: true,
    allowedCommands: ['cat', 'ls', 'pwd', 'git', 'grep', 'find'],
    maxFileSize: 100 * 1024 // 100KB
  });
}

/**
 * Sandbox für Tests
 */
export function createTestSandbox(projectRoot: string): Sandbox {
  return new Sandbox({
    projectRoot,
    allowedCommands: [
      'npm', 'npx', 'node', 'yarn', 'pnpm', 'bun',
      'jest', 'vitest', 'mocha', 'pytest',
      'cargo', 'tsc', 'eslint'
    ],
    maxFileSize: 5 * 1024 * 1024 // 5MB für Tests
  });
}
