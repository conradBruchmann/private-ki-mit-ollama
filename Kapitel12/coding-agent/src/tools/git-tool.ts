/**
 * Git Operations Tool
 * Kapitel 11: Architektur eines Programmierautomaten
 */

import { spawn } from "child_process";
import { Tool, ToolResult } from "./types.js";

export class GitTool implements Tool {
  name = "git";
  description = "Führt Git-Operationen aus";

  definition = {
    type: "function" as const,
    function: {
      name: "git",
      description: "Führt Git-Befehle aus (status, diff, add, commit, log)",
      parameters: {
        type: "object" as const,
        properties: {
          operation: {
            type: "string",
            description: "Git-Operation",
            enum: ["status", "diff", "add", "commit", "log", "branch", "show"],
          },
          args: {
            type: "string",
            description: "Zusätzliche Argumente",
          },
          message: {
            type: "string",
            description: "Commit-Message (nur für commit)",
          },
        },
        required: ["operation"],
      },
    },
  };

  constructor(private projectRoot: string) {}

  async execute(input: {
    operation: string;
    args?: string;
    message?: string;
  }): Promise<ToolResult> {
    const { operation, args, message } = input;

    // Erlaubte Operationen
    const allowedOps = ["status", "diff", "add", "commit", "log", "branch", "show"];
    if (!allowedOps.includes(operation)) {
      return {
        success: false,
        error: `Operation not allowed: ${operation}`,
      };
    }

    let command: string;

    switch (operation) {
      case "status":
        command = "git status --porcelain";
        break;
      case "diff":
        command = args ? `git diff ${args}` : "git diff";
        break;
      case "add":
        command = args ? `git add ${args}` : "git add .";
        break;
      case "commit":
        if (!message) {
          return { success: false, error: "Commit message required" };
        }
        // Escape message
        const escapedMsg = message.replace(/"/g, '\\"');
        command = `git commit -m "${escapedMsg}"`;
        break;
      case "log":
        command = args
          ? `git log ${args}`
          : "git log --oneline -10";
        break;
      case "branch":
        command = args ? `git branch ${args}` : "git branch";
        break;
      case "show":
        command = args ? `git show ${args}` : "git show --stat";
        break;
      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }

    return this.runGit(command);
  }

  private runGit(command: string): Promise<ToolResult> {
    return new Promise((resolve) => {
      const proc = spawn(command, {
        cwd: this.projectRoot,
        shell: true,
        timeout: 30000,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output: {
              stdout: stdout.trim(),
              stderr: stderr.trim(),
            },
          });
        } else {
          resolve({
            success: false,
            error: stderr.trim() || `Git command failed with code ${code}`,
            output: { stdout: stdout.trim() },
          });
        }
      });

      proc.on("error", (error) => {
        resolve({
          success: false,
          error: `Git execution failed: ${error.message}`,
        });
      });
    });
  }
}
