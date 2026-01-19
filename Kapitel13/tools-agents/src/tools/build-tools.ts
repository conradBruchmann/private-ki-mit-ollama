/**
 * Build & Test Tools
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  BaseTool,
  createToolDefinition,
  successResult,
  errorResult,
  type ToolResult,
  type ToolDefinition
} from './types.js';

// ============================================================================
// Helper: Command ausführen mit Timeout
// ============================================================================

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeout: number = 300000 // 5 Minuten default
): Promise<CommandResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn(command, args, {
      cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeout);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
        timedOut
      });
    });

    proc.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: error.message,
        exitCode: 1,
        timedOut: false
      });
    });
  });
}

// ============================================================================
// Run Tests Tool
// ============================================================================

interface RunTestsInput {
  pattern?: string;
  coverage?: boolean;
  watch?: boolean;
  timeout?: number;
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

interface RunTestsOutput {
  success: boolean;
  runner: string;
  results: TestResults;
  output: string;
  exitCode: number;
  duration: number;
}

export class RunTestsTool extends BaseTool<RunTestsInput, RunTestsOutput> {
  name = 'run_tests';
  description = 'Führt Tests aus';

  definition: ToolDefinition = createToolDefinition({
    name: 'run_tests',
    description: 'Führt die Test-Suite aus (jest, vitest, pytest, cargo test)',
    properties: {
      pattern: {
        type: 'string',
        description: 'Test-Pattern oder Datei (z.B. "auth" oder "src/auth.test.ts")'
      },
      coverage: {
        type: 'boolean',
        description: 'Code-Coverage generieren'
      },
      watch: {
        type: 'boolean',
        description: 'Watch-Modus (nicht empfohlen für Agenten)'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in Sekunden (default: 300)'
      }
    },
    required: []
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'build', timeout: 300000 });
  }

  async execute(input: RunTestsInput): Promise<ToolResult<RunTestsOutput>> {
    const startTime = Date.now();
    const runner = await this.detectTestRunner();

    if (!runner) {
      return errorResult('Kein Test-Runner gefunden (jest, vitest, pytest, cargo)');
    }

    const { command, args } = this.buildCommand(runner, input);
    const timeout = (input.timeout ?? 300) * 1000;

    const result = await runCommand(command, args, this.projectRoot, timeout);

    if (result.timedOut) {
      return errorResult(`Test timeout after ${timeout / 1000}s`);
    }

    const combinedOutput = result.stdout + result.stderr;
    const testResults = this.parseTestOutput(combinedOutput, runner);

    // Output kürzen
    const output = combinedOutput.length > 10000
      ? combinedOutput.slice(-10000)
      : combinedOutput;

    return successResult({
      success: result.exitCode === 0,
      runner,
      results: testResults,
      output,
      exitCode: result.exitCode,
      duration: Date.now() - startTime
    });
  }

  private async detectTestRunner(): Promise<string | null> {
    // Vitest
    if (
      existsSync(join(this.projectRoot, 'vitest.config.ts')) ||
      existsSync(join(this.projectRoot, 'vitest.config.js'))
    ) {
      return 'vitest';
    }

    // Jest
    if (
      existsSync(join(this.projectRoot, 'jest.config.js')) ||
      existsSync(join(this.projectRoot, 'jest.config.ts'))
    ) {
      return 'jest';
    }

    // Pytest
    if (
      existsSync(join(this.projectRoot, 'pytest.ini')) ||
      existsSync(join(this.projectRoot, 'pyproject.toml'))
    ) {
      return 'pytest';
    }

    // Cargo
    if (existsSync(join(this.projectRoot, 'Cargo.toml'))) {
      return 'cargo';
    }

    // Fallback: package.json prüfen
    try {
      const pkgPath = join(this.projectRoot, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = await import(pkgPath, { assert: { type: 'json' } });
        if (pkg.default?.devDependencies?.vitest) return 'vitest';
        if (pkg.default?.devDependencies?.jest) return 'jest';
      }
    } catch {
      // Ignore
    }

    return null;
  }

  private buildCommand(
    runner: string,
    input: RunTestsInput
  ): { command: string; args: string[] } {
    const args: string[] = [];

    switch (runner) {
      case 'vitest':
        args.push('npx', 'vitest', 'run');
        if (input.pattern) args.push(input.pattern);
        if (input.coverage) args.push('--coverage');
        if (input.watch) args.push('--watch');
        break;

      case 'jest':
        args.push('npx', 'jest');
        if (input.pattern) args.push(input.pattern);
        if (input.coverage) args.push('--coverage');
        if (input.watch) args.push('--watch');
        args.push('--passWithNoTests');
        break;

      case 'pytest':
        args.push('pytest');
        if (input.pattern) args.push('-k', input.pattern);
        if (input.coverage) args.push('--cov');
        args.push('-v');
        break;

      case 'cargo':
        args.push('cargo', 'test');
        if (input.pattern) args.push(input.pattern);
        args.push('--', '--nocapture');
        break;
    }

    return { command: args.shift()!, args };
  }

  private parseTestOutput(output: string, runner: string): TestResults {
    const result = { total: 0, passed: 0, failed: 0, skipped: 0 };

    // Vitest/Jest: Tests: X passed, Y failed, Z total
    const vitestMatch = output.match(
      /Tests:\s*(?:(\d+)\s*passed)?(?:,\s*(\d+)\s*failed)?(?:,\s*(\d+)\s*skipped)?(?:,\s*)?(\d+)\s*total/i
    );
    if (vitestMatch) {
      result.passed = parseInt(vitestMatch[1]) || 0;
      result.failed = parseInt(vitestMatch[2]) || 0;
      result.skipped = parseInt(vitestMatch[3]) || 0;
      result.total = parseInt(vitestMatch[4]) || 0;
      return result;
    }

    // Pytest: X passed, Y failed
    const pytestMatch = output.match(/(\d+)\s*passed.*?(\d+)\s*failed/i);
    if (pytestMatch) {
      result.passed = parseInt(pytestMatch[1]);
      result.failed = parseInt(pytestMatch[2]);
      result.total = result.passed + result.failed;
      return result;
    }

    // Cargo: X passed; Y failed
    const cargoMatch = output.match(/(\d+)\s*passed;\s*(\d+)\s*failed/i);
    if (cargoMatch) {
      result.passed = parseInt(cargoMatch[1]);
      result.failed = parseInt(cargoMatch[2]);
      result.total = result.passed + result.failed;
      return result;
    }

    return result;
  }
}

// ============================================================================
// Type Check Tool
// ============================================================================

interface TypeCheckInput {
  file?: string;
  strict?: boolean;
}

interface TypeError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

interface TypeCheckOutput {
  success: boolean;
  errorCount: number;
  errors: TypeError[];
  output: string;
}

export class TypeCheckTool extends BaseTool<TypeCheckInput, TypeCheckOutput> {
  name = 'type_check';
  description = 'Führt Type-Checking durch';

  definition: ToolDefinition = createToolDefinition({
    name: 'type_check',
    description: 'Prüft TypeScript/Rust-Typen auf Fehler',
    properties: {
      file: {
        type: 'string',
        description: 'Optional: Nur diese Datei prüfen'
      },
      strict: {
        type: 'boolean',
        description: 'Strikte Prüfung aktivieren'
      }
    },
    required: []
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'build' });
  }

  async execute(input: TypeCheckInput): Promise<ToolResult<TypeCheckOutput>> {
    const isTypeScript = existsSync(join(this.projectRoot, 'tsconfig.json'));
    const isRust = existsSync(join(this.projectRoot, 'Cargo.toml'));

    if (!isTypeScript && !isRust) {
      return errorResult('Kein TypeScript oder Rust Projekt gefunden');
    }

    let command: string;
    let args: string[];

    if (isTypeScript) {
      command = 'npx';
      args = ['tsc', '--noEmit'];
      if (input.file) args.push(input.file);
    } else {
      command = 'cargo';
      args = ['check', '--message-format=short'];
    }

    const result = await runCommand(command, args, this.projectRoot, 120000);

    const combinedOutput = result.stdout + result.stderr;
    const errors = isTypeScript
      ? this.parseTypeScriptErrors(combinedOutput)
      : this.parseCargoErrors(combinedOutput);

    return successResult({
      success: result.exitCode === 0,
      errorCount: errors.length,
      errors: errors.slice(0, 30), // Max 30 Fehler
      output: combinedOutput.slice(0, 5000)
    });
  }

  private parseTypeScriptErrors(output: string): TypeError[] {
    const errors: TypeError[] = [];
    // Pattern: src/file.ts(10,5): error TS2345: message
    const pattern = /([^(\s]+)\((\d+),(\d+)\):\s*error\s*(TS\d+):\s*(.+)/g;
    let match;

    while ((match = pattern.exec(output)) !== null) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        code: match[4],
        message: match[5].trim()
      });
    }

    return errors;
  }

  private parseCargoErrors(output: string): TypeError[] {
    const errors: TypeError[] = [];
    // Pattern: error[E0308]: message
    const pattern = /error\[(\w+)\]:\s*(.+?)(?=\s*-->|$)/g;
    let match;

    while ((match = pattern.exec(output)) !== null) {
      errors.push({
        file: '',
        line: 0,
        column: 0,
        code: match[1],
        message: match[2].trim()
      });
    }

    return errors;
  }
}

// ============================================================================
// Lint Tool
// ============================================================================

interface LintInput {
  fix?: boolean;
  file?: string;
}

interface LintIssue {
  file: string;
  line: number;
  column: number;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

interface LintOutput {
  success: boolean;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  issues: LintIssue[];
  fixed?: number;
}

export class LintTool extends BaseTool<LintInput, LintOutput> {
  name = 'lint';
  description = 'Führt Linting durch';

  definition: ToolDefinition = createToolDefinition({
    name: 'lint',
    description: 'Prüft Code auf Style-Probleme und potenzielle Fehler',
    properties: {
      fix: {
        type: 'boolean',
        description: 'Automatisch behebbare Probleme fixen'
      },
      file: {
        type: 'string',
        description: 'Nur diese Datei linten'
      }
    },
    required: []
  });

  constructor(projectRoot: string) {
    super(projectRoot, { category: 'build' });
  }

  async execute(input: LintInput): Promise<ToolResult<LintOutput>> {
    // Linter erkennen
    const hasEslint =
      existsSync(join(this.projectRoot, '.eslintrc.js')) ||
      existsSync(join(this.projectRoot, '.eslintrc.json')) ||
      existsSync(join(this.projectRoot, 'eslint.config.js'));

    const hasBiome = existsSync(join(this.projectRoot, 'biome.json'));

    let command: string;
    let args: string[];

    if (hasBiome) {
      command = 'npx';
      args = ['biome', 'lint'];
      if (input.fix) args.push('--apply');
      args.push(input.file || '.');
    } else if (hasEslint) {
      command = 'npx';
      args = ['eslint', '--format=compact'];
      if (input.fix) args.push('--fix');
      args.push(input.file || '.');
    } else {
      return errorResult('Kein Linter gefunden (ESLint, Biome)');
    }

    const result = await runCommand(command, args, this.projectRoot, 120000);

    const combinedOutput = result.stdout + result.stderr;
    const issues = this.parseLintOutput(combinedOutput);

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    return successResult({
      success: result.exitCode === 0,
      issueCount: issues.length,
      errorCount,
      warningCount,
      issues: issues.slice(0, 50),
      fixed: input.fix ? this.countFixed(combinedOutput) : undefined
    });
  }

  private parseLintOutput(output: string): LintIssue[] {
    const issues: LintIssue[] = [];

    // ESLint compact format: /path/file.ts: line X, col Y, Severity - Message (rule)
    const pattern =
      /(.+):\s*line\s*(\d+).*?col\s*(\d+).*?(Error|Warning)\s*-\s*(.+?)\s*\((.+)\)/gi;
    let match;

    while ((match = pattern.exec(output)) !== null) {
      issues.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        severity: match[4].toLowerCase() as 'error' | 'warning',
        message: match[5],
        rule: match[6]
      });
    }

    return issues;
  }

  private countFixed(output: string): number {
    const match = output.match(/(\d+)\s*(?:problems?|issues?)\s*fixed/i);
    return match ? parseInt(match[1]) : 0;
  }
}

// ============================================================================
// Run Command Tool
// ============================================================================

interface RunCommandInput {
  command: string;
  timeout?: number;
}

interface RunCommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  duration: number;
}

export class RunCommandTool extends BaseTool<RunCommandInput, RunCommandOutput> {
  name = 'run_command';
  description = 'Führt einen Shell-Befehl aus';

  definition: ToolDefinition = createToolDefinition({
    name: 'run_command',
    description: 'Führt einen Shell-Befehl im Projektverzeichnis aus. VORSICHT: Nur sichere Befehle!',
    properties: {
      command: {
        type: 'string',
        description: 'Der auszuführende Befehl'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in Sekunden (default: 60)'
      }
    },
    required: ['command']
  });

  constructor(projectRoot: string) {
    super(projectRoot, {
      category: 'shell',
      isDestructive: true,
      requiresConfirmation: true
    });
  }

  async execute(input: RunCommandInput): Promise<ToolResult<RunCommandOutput>> {
    const startTime = Date.now();
    const timeout = (input.timeout ?? 60) * 1000;

    // Gefährliche Befehle blockieren
    const dangerous = ['rm -rf', 'sudo', 'chmod 777', '> /dev', '| sh', 'curl | bash'];
    for (const d of dangerous) {
      if (input.command.includes(d)) {
        return errorResult(`Dangerous command blocked: ${d}`);
      }
    }

    const result = await runCommand('sh', ['-c', input.command], this.projectRoot, timeout);

    // Output kürzen
    const maxLen = 10000;
    const stdout = result.stdout.length > maxLen ? result.stdout.slice(-maxLen) : result.stdout;
    const stderr = result.stderr.length > maxLen ? result.stderr.slice(-maxLen) : result.stderr;

    return successResult({
      stdout,
      stderr,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      duration: Date.now() - startTime
    });
  }
}

// ============================================================================
// Export All Build Tools
// ============================================================================

export function createBuildTools(projectRoot: string) {
  return [
    new RunTestsTool(projectRoot),
    new TypeCheckTool(projectRoot),
    new LintTool(projectRoot),
    new RunCommandTool(projectRoot)
  ];
}
