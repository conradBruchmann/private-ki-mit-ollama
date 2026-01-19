/**
 * Tool-Typen und Interfaces
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

// ============================================================================
// Tool Definition (OpenAI-kompatibles Format)
// ============================================================================

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolParameters;
  };
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolProperty>;
  required: string[];
}

export interface ToolProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: { type: string };
  default?: unknown;
}

// ============================================================================
// Tool Result
// ============================================================================

export interface ToolResult<T = unknown> {
  success: boolean;
  output?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

export function successResult<T>(output: T, metadata?: Record<string, unknown>): ToolResult<T> {
  return { success: true, output, metadata };
}

export function errorResult(error: string, metadata?: Record<string, unknown>): ToolResult {
  return { success: false, error, metadata };
}

// ============================================================================
// Tool Interface
// ============================================================================

export interface Tool<TInput = unknown, TOutput = unknown> {
  /** Eindeutiger Name des Tools */
  name: string;

  /** Kurze Beschreibung für das LLM */
  description: string;

  /** OpenAI-kompatible Tool-Definition */
  definition: ToolDefinition;

  /** Tool ausführen */
  execute(input: TInput): Promise<ToolResult<TOutput>>;
}

// ============================================================================
// Tool Categories
// ============================================================================

export type ToolCategory =
  | 'filesystem'
  | 'git'
  | 'build'
  | 'analysis'
  | 'shell'
  | 'documentation';

export interface ToolMetadata {
  category: ToolCategory;
  requiresConfirmation?: boolean;
  isDestructive?: boolean;
  timeout?: number;
}

// ============================================================================
// Base Tool Class
// ============================================================================

export abstract class BaseTool<TInput = unknown, TOutput = unknown>
  implements Tool<TInput, TOutput>
{
  abstract name: string;
  abstract description: string;
  abstract definition: ToolDefinition;

  protected projectRoot: string;
  protected metadata: ToolMetadata;

  constructor(projectRoot: string, metadata?: Partial<ToolMetadata>) {
    this.projectRoot = projectRoot;
    this.metadata = {
      category: 'filesystem',
      requiresConfirmation: false,
      isDestructive: false,
      ...metadata
    };
  }

  abstract execute(input: TInput): Promise<ToolResult<TOutput>>;

  /**
   * Validiert Eingabe gegen das Schema
   */
  protected validateInput(input: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const params = this.definition.function.parameters;
    const inputObj = input as Record<string, unknown>;

    // Required-Felder prüfen
    for (const required of params.required) {
      if (!(required in inputObj) || inputObj[required] === undefined) {
        errors.push(`Missing required parameter: ${required}`);
      }
    }

    // Typ-Prüfung
    for (const [key, prop] of Object.entries(params.properties)) {
      const value = inputObj[key];
      if (value !== undefined) {
        if (!this.checkType(value, prop.type)) {
          errors.push(`Invalid type for ${key}: expected ${prop.type}`);
        }
        if (prop.enum && !prop.enum.includes(String(value))) {
          errors.push(`Invalid value for ${key}: must be one of ${prop.enum.join(', ')}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private checkType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      default:
        return true;
    }
  }
}

// ============================================================================
// Tool Builder Helper
// ============================================================================

export function createToolDefinition(config: {
  name: string;
  description: string;
  properties: Record<string, Omit<ToolProperty, 'type'> & { type: ToolProperty['type'] }>;
  required?: string[];
}): ToolDefinition {
  return {
    type: 'function',
    function: {
      name: config.name,
      description: config.description,
      parameters: {
        type: 'object',
        properties: config.properties,
        required: config.required || []
      }
    }
  };
}
