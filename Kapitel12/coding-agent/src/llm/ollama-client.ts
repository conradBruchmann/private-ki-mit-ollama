/**
 * Ollama LLM Client
 * Kapitel 11: Architektur eines Programmierautomaten
 */

import {
  Message,
  ChatRequest,
  ChatResponse,
  LLMToolCall,
  ToolDefinition,
} from "../types/message.js";

export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  timeout: number;
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: "http://localhost:11434",
  defaultModel: "llama3.2",
  timeout: 120000,
};

export class OllamaClient {
  private config: OllamaConfig;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Chat-Completion mit Tool-Support
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model || this.config.defaultModel;

    const body: Record<string, unknown> = {
      model,
      messages: this.convertMessages(request.messages),
      stream: false,
      options: {
        temperature: request.temperature ?? 0.7,
      },
    };

    // Tools hinzufügen wenn vorhanden
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
    }

    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      message: {
        role: string;
        content: string;
        tool_calls?: Array<{
          id: string;
          type: string;
          function: { name: string; arguments: string | Record<string, unknown> };
        }>;
      };
      done: boolean;
    };

    return this.parseResponse(data);
  }

  /**
   * Streaming Chat
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<string> {
    const model = request.model || this.config.defaultModel;

    const body: Record<string, unknown> = {
      model,
      messages: this.convertMessages(request.messages),
      stream: true,
      options: {
        temperature: request.temperature ?? 0.7,
      },
    };

    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line) as {
            message?: { content: string };
            done: boolean;
          };
          if (data.message?.content) {
            yield data.message.content;
          }
        } catch {
          // Skip parse errors
        }
      }
    }
  }

  /**
   * Prüft ob ein Modell verfügbar ist
   */
  async isModelAvailable(model: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      const data = await response.json() as {
        models: Array<{ name: string }>;
      };
      return data.models.some((m) => m.name.startsWith(model));
    } catch {
      return false;
    }
  }

  /**
   * Listet verfügbare Modelle
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.config.baseUrl}/api/tags`);
    const data = await response.json() as {
      models: Array<{ name: string }>;
    };
    return data.models.map((m) => m.name);
  }

  /**
   * Konvertiert Messages in Ollama-Format
   */
  private convertMessages(messages: Message[]): Array<{
    role: string;
    content: string;
    tool_calls?: LLMToolCall[];
  }> {
    return messages.map((msg) => {
      if (msg.role === "tool") {
        // Tool-Response als User-Message formatieren
        return {
          role: "user",
          content: `Tool Result (${msg.toolCallId}):\n${msg.content}`,
        };
      }
      return {
        role: msg.role,
        content: msg.content || "",
        ...(msg.toolCalls && { tool_calls: msg.toolCalls }),
      };
    });
  }

  /**
   * Parst Ollama-Response
   */
  private parseResponse(data: {
    message: {
      content: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string | Record<string, unknown> };
      }>;
    };
  }): ChatResponse {
    const toolCalls = data.message.tool_calls?.map((tc) => ({
      id: tc.id || `call-${Date.now()}`,
      type: "function" as const,
      function: {
        name: tc.function.name,
        arguments:
          typeof tc.function.arguments === "string"
            ? tc.function.arguments
            : JSON.stringify(tc.function.arguments),
      },
    }));

    return {
      content: data.message.content,
      toolCalls,
      finishReason: toolCalls && toolCalls.length > 0 ? "tool_calls" : "stop",
    };
  }
}
