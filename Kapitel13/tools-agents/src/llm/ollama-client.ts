/**
 * Ollama Client mit Tool-Support
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

import type { ToolDefinition, ToolResult } from '../tools/types.js';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON-String
  };
}

export interface ChatResponse {
  model: string;
  created_at: string;
  message: ChatMessage;
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface ExecutedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result: ToolResult;
  duration: number;
}

export interface ChatWithToolsResult {
  response: string;
  toolCalls: ExecutedToolCall[];
  iterations: number;
  totalDuration: number;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  stream?: boolean;
  keepAlive?: string;
}

// ============================================================================
// Ollama Client
// ============================================================================

export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;

  constructor(
    baseUrl: string = 'http://localhost:11434',
    defaultModel: string = 'llama3.2'
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultModel = defaultModel;
  }

  /**
   * Einfacher Chat-Aufruf
   */
  async chat(options: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages: options.messages,
        tools: options.tools,
        options: {
          temperature: options.temperature ?? 0.7
        },
        stream: options.stream ?? false,
        keep_alive: options.keepAlive
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Streaming Chat
   */
  async *chatStream(options: ChatOptions): AsyncGenerator<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages: options.messages,
        tools: options.tools,
        options: {
          temperature: options.temperature ?? 0.7
        },
        stream: true,
        keep_alive: options.keepAlive
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            yield JSON.parse(line);
          } catch {
            // Ignore invalid JSON
          }
        }
      }
    }

    // Rest des Buffers verarbeiten
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Chat mit automatischer Tool-Ausführung
   */
  async chatWithTools(params: {
    model?: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
    toolExecutor: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
    maxIterations?: number;
    onToolCall?: (name: string, args: Record<string, unknown>) => void;
    onToolResult?: (name: string, result: ToolResult) => void;
  }): Promise<ChatWithToolsResult> {
    const {
      model = this.defaultModel,
      tools,
      toolExecutor,
      maxIterations = 10,
      onToolCall,
      onToolResult
    } = params;

    const messages = [...params.messages];
    const executedTools: ExecutedToolCall[] = [];
    const startTime = Date.now();

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      const result = await this.chat({
        model,
        messages,
        tools
      });

      // Keine Tool-Calls → fertig
      if (!result.message.tool_calls || result.message.tool_calls.length === 0) {
        return {
          response: result.message.content || '',
          toolCalls: executedTools,
          iterations: iteration,
          totalDuration: Date.now() - startTime
        };
      }

      // Tool-Calls zur Konversation hinzufügen
      messages.push(result.message);

      // Tools ausführen
      for (const toolCall of result.message.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown>;

        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          toolArgs = {};
        }

        // Callback vor Ausführung
        onToolCall?.(toolName, toolArgs);

        // Tool ausführen
        const toolStart = Date.now();
        const toolResult = await toolExecutor(toolName, toolArgs);
        const toolDuration = Date.now() - toolStart;

        // Callback nach Ausführung
        onToolResult?.(toolName, toolResult);

        // Ergebnis speichern
        executedTools.push({
          id: toolCall.id,
          name: toolName,
          arguments: toolArgs,
          result: toolResult,
          duration: toolDuration
        });

        // Ergebnis zur Konversation hinzufügen
        messages.push({
          role: 'tool',
          content: JSON.stringify(toolResult),
          tool_call_id: toolCall.id
        });
      }
    }

    throw new Error(`Max iterations (${maxIterations}) reached without completion`);
  }

  /**
   * Verfügbare Modelle abrufen
   */
  async listModels(): Promise<Array<{ name: string; size: number; modified_at: string }>> {
    const response = await fetch(`${this.baseUrl}/api/tags`);

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = await response.json();
    return data.models || [];
  }

  /**
   * Prüft ob Ollama erreichbar ist
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Prüft ob ein bestimmtes Modell verfügbar ist
   */
  async hasModel(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some(m => m.name.startsWith(modelName));
    } catch {
      return false;
    }
  }

  /**
   * Generate (Non-Chat API)
   */
  async generate(params: {
    model?: string;
    prompt: string;
    system?: string;
    temperature?: number;
    stream?: boolean;
  }): Promise<{ response: string; context?: number[] }> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model || this.defaultModel,
        prompt: params.prompt,
        system: params.system,
        options: {
          temperature: params.temperature ?? 0.7
        },
        stream: params.stream ?? false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    return response.json();
  }

  get url(): string {
    return this.baseUrl;
  }

  get model(): string {
    return this.defaultModel;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Erstellt eine System-Message
 */
export function systemMessage(content: string): ChatMessage {
  return { role: 'system', content };
}

/**
 * Erstellt eine User-Message
 */
export function userMessage(content: string): ChatMessage {
  return { role: 'user', content };
}

/**
 * Erstellt eine Assistant-Message
 */
export function assistantMessage(content: string): ChatMessage {
  return { role: 'assistant', content };
}

/**
 * Erstellt eine Tool-Result-Message
 */
export function toolMessage(result: ToolResult, toolCallId: string): ChatMessage {
  return {
    role: 'tool',
    content: JSON.stringify(result),
    tool_call_id: toolCallId
  };
}
