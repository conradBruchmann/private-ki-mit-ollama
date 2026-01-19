/**
 * LLM Export
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

export {
  OllamaClient,
  systemMessage,
  userMessage,
  assistantMessage,
  toolMessage,
  type ChatMessage,
  type ToolCall,
  type ChatResponse,
  type ExecutedToolCall,
  type ChatWithToolsResult,
  type ChatOptions
} from './ollama-client.js';
