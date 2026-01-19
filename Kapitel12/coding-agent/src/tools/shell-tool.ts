/**
 * Shell Executor Tool
 * Kapitel 11: Architektur eines Programmierautomaten
 */

import { spawn } from "child_process";
import { Tool, ToolResult } from "./types.js";

export class RunCommandTool implements Tool {
  name = "run_command";
  description = "Führt einen Shell-Befehl aus";

  definition = {
    type: "function" as const,
    function: {
      name: "run_command",
      description: "Führt einen Shell-Befehl im Projektverzeichnis aus",
      parameters: {
        type: "object" as const,
        properties: {
          command: {
            type: "string",
            description: "Der auszuführende Befehl",
          },
          timeout: {
            type: "number",
            description: "Timeout in Sekunden (default: 60)",
          },
        },
        required: ["command"],
      },
    },
  };

  // Erlaubte Befehle (Whitelist)
  private allowedCommands = [
    "npm",
    "npx",
    "yarn",
    "pnpm",
    "bun",
    "node",
    "tsc",
    "eslint",
    "prettier",
    "jest",
    "vitest",
    "mocha",
    "cargo",
    "rustc",
    "clippy",
    "python",
    "pip",
    "pytest",
    "git",
    "cat",
    "ls",
    "head",
    "tail",
    "wc",
    "grep",
    "find",
  ];

  constructor(private projectRoot: string) {}

  async execute(input: {
    command: string;
    timeout?: number;
  }): Promise<ToolResult> {
    const { command, timeout = 60 } = input;

    // Security: Befehl prüfen
    const baseCommand = command.split(" ")[0];
    if (!this.allowedCommands.includes(baseCommand)) {
      return {
        success: false,
        error: `Command not allowed: ${baseCommand}. Allowed: ${this.allowedCommands.join(", ")}`,
      };
    }

    // Gefährliche Patterns blockieren
    const dangerousPatterns = [
      /rm\s+-rf/,
      />\s*\/dev/,
      /\|\s*sh/,
      /curl.*\|.*bash/,
      /wget.*\|.*sh/,
      /sudo/,
      /chmod\s+777/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          success: false,
          error: "Potentially dangerous command blocked",
        };
      }
    }

    return new Promise((resolve) => {
      const proc = spawn(command, {
        cwd: this.projectRoot,
        shell: true,
        timeout: timeout * 1000,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
        // Limit output size
        if (stdout.length > 50000) {
          stdout = stdout.slice(-50000);
        }
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
        if (stderr.length > 50000) {
          stderr = stderr.slice(-50000);
        }
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output: {
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              exitCode: code,
            },
          });
        } else {
          resolve({
            success: false,
            error: `Command failed with code ${code}`,
            output: {
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              exitCode: code,
            },
          });
        }
      });

      proc.on("error", (error) => {
        resolve({
          success: false,
          error: `Failed to execute: ${error.message}`,
        });
      });
    });
  }
}
