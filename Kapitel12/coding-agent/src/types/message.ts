/**
 * Message-Typdefinitionen für LLM-Kommunikation
 * Kapitel 11: Architektur eines Programmierautomaten
 */

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  toolCalls?: LLMToolCall[];
  toolCallId?: string;
}

export interface LLMToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  temperature?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  toolCalls?: LLMToolCall[];
  finishReason: "stop" | "tool_calls" | "length";
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, PropertyDefinition>;
      required: string[];
    };
  };
}

export interface PropertyDefinition {
  type: string;
  description: string;
  enum?: string[];
}
