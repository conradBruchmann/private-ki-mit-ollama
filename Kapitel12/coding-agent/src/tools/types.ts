/**
 * Tool-Typdefinitionen
 * Kapitel 11: Architektur eines Programmierautomaten
 */

import { ToolDefinition } from "../types/message.js";

export interface Tool {
  name: string;
  description: string;
  definition: ToolDefinition;
  execute(input: Record<string, unknown>): Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

export class ToolExecutor {
  private tools: Map<string, Tool> = new Map();

  constructor(tools: Tool[]) {
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  async execute(call: { name: string; arguments: unknown }): Promise<ToolResult> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return { success: false, error: `Unknown tool: ${call.name}` };
    }

    try {
      const args = typeof call.arguments === "string"
        ? JSON.parse(call.arguments)
        : call.arguments;
      return await tool.execute(args as Record<string, unknown>);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.getTools().map((t) => t.definition);
  }
}
