/**
 * Tool Registry
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

import type { Tool, ToolDefinition, ToolResult, ToolCategory } from './types.js';

// ============================================================================
// Tool Registry
// ============================================================================

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private categories: Map<ToolCategory, string[]> = new Map();

  /**
   * Tool registrieren
   */
  register(tool: Tool, category?: ToolCategory): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" already registered, overwriting`);
    }

    this.tools.set(tool.name, tool);

    // Kategorie-Tracking
    if (category) {
      const categoryTools = this.categories.get(category) || [];
      if (!categoryTools.includes(tool.name)) {
        categoryTools.push(tool.name);
      }
      this.categories.set(category, categoryTools);
    }
  }

  /**
   * Mehrere Tools registrieren
   */
  registerAll(tools: Tool[], category?: ToolCategory): void {
    for (const tool of tools) {
      this.register(tool, category);
    }
  }

  /**
   * Tool abrufen
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Tool existiert?
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Tool entfernen
   */
  unregister(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) return false;

    this.tools.delete(name);

    // Aus Kategorien entfernen
    for (const [category, toolNames] of this.categories) {
      const index = toolNames.indexOf(name);
      if (index !== -1) {
        toolNames.splice(index, 1);
        this.categories.set(category, toolNames);
      }
    }

    return true;
  }

  /**
   * Alle Tool-Definitionen für LLM-API
   */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  /**
   * Tool-Definitionen nach Kategorien
   */
  getDefinitionsByCategory(category: ToolCategory): ToolDefinition[] {
    const toolNames = this.categories.get(category) || [];
    return toolNames
      .map(name => this.tools.get(name))
      .filter((t): t is Tool => t !== undefined)
      .map(t => t.definition);
  }

  /**
   * Tool ausführen
   */
  async execute(name: string, args: unknown): Promise<ToolResult> {
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${name}. Available tools: ${this.list().join(', ')}`
      };
    }

    try {
      return await tool.execute(args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Tool execution failed: ${message}`
      };
    }
  }

  /**
   * Liste aller Tool-Namen
   */
  list(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Tools nach Kategorie
   */
  listByCategory(category: ToolCategory): string[] {
    return this.categories.get(category) || [];
  }

  /**
   * Alle Kategorien
   */
  getCategories(): ToolCategory[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Anzahl registrierter Tools
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Tool-Executor-Funktion für OllamaClient
   */
  createExecutor(): (name: string, args: Record<string, unknown>) => Promise<ToolResult> {
    return async (name: string, args: Record<string, unknown>) => {
      return this.execute(name, args);
    };
  }

  /**
   * Detaillierte Tool-Info
   */
  getInfo(name: string): {
    name: string;
    description: string;
    parameters: string[];
    required: string[];
  } | null {
    const tool = this.tools.get(name);
    if (!tool) return null;

    return {
      name: tool.name,
      description: tool.description,
      parameters: Object.keys(tool.definition.function.parameters.properties),
      required: tool.definition.function.parameters.required
    };
  }

  /**
   * Alle Tools mit Details
   */
  getAll(): Array<{
    name: string;
    description: string;
    category?: ToolCategory;
  }> {
    return Array.from(this.tools.entries()).map(([name, tool]) => {
      let category: ToolCategory | undefined;
      for (const [cat, names] of this.categories) {
        if (names.includes(name)) {
          category = cat;
          break;
        }
      }
      return { name, description: tool.description, category };
    });
  }

  /**
   * Zusammenfassung für System-Prompt
   */
  getSummary(): string {
    const lines: string[] = ['Verfügbare Tools:'];

    for (const category of this.getCategories()) {
      const toolNames = this.listByCategory(category);
      if (toolNames.length > 0) {
        lines.push(`\n${category.toUpperCase()}:`);
        for (const name of toolNames) {
          const tool = this.tools.get(name);
          if (tool) {
            lines.push(`  - ${name}: ${tool.description}`);
          }
        }
      }
    }

    // Tools ohne Kategorie
    const categorizedTools = new Set(
      Array.from(this.categories.values()).flat()
    );
    const uncategorized = this.list().filter(n => !categorizedTools.has(n));

    if (uncategorized.length > 0) {
      lines.push('\nANDERE:');
      for (const name of uncategorized) {
        const tool = this.tools.get(name);
        if (tool) {
          lines.push(`  - ${name}: ${tool.description}`);
        }
      }
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Erstellt eine leere Registry
 */
export function createRegistry(): ToolRegistry {
  return new ToolRegistry();
}
