/**
 * Code-Assistant Service
 * Kapitel 7: Code-Assistent mit Ollama
 */

import ollama from 'ollama';
import {
  CodeRequest,
  CodeResponse,
  CodeOperation,
  CODE_MODELS,
} from './types.js';
import { buildPrompt, getSystemPrompt, getTemperature } from './prompts.js';

const DEFAULT_MODEL =
  process.env.CODE_MODEL || 'qwen2.5-coder:14b-instruct';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

export interface ServiceOptions {
  model?: string;
  host?: string;
  maxTokens?: number;
}

export class CodeAssistantService {
  private model: string;
  private host: string;
  private maxTokens: number;

  constructor(options: ServiceOptions = {}) {
    this.model = options.model || DEFAULT_MODEL;
    this.host = options.host || OLLAMA_HOST;
    this.maxTokens = options.maxTokens || 4000;
  }

  async execute(request: CodeRequest): Promise<CodeResponse> {
    const startTime = Date.now();

    const prompt = buildPrompt(
      request.operation,
      request.code,
      request.prompt,
      request.language,
      request.context,
      request.files
    );

    const systemPrompt = getSystemPrompt(request.operation);
    const temperature = getTemperature(request.operation);

    const response = await ollama.chat({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      options: {
        temperature,
        num_predict: this.maxTokens,
      },
    });

    const duration = Date.now() - startTime;

    return {
      result: response.message.content,
      tokens: response.eval_count ?? 0,
      duration,
      model: this.model,
    };
  }

  async *stream(
    request: CodeRequest
  ): AsyncGenerator<string, void, undefined> {
    const prompt = buildPrompt(
      request.operation,
      request.code,
      request.prompt,
      request.language,
      request.context,
      request.files
    );

    const systemPrompt = getSystemPrompt(request.operation);
    const temperature = getTemperature(request.operation);

    const response = await ollama.chat({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      stream: true,
      options: {
        temperature,
        num_predict: this.maxTokens,
      },
    });

    for await (const chunk of response) {
      yield chunk.message.content;
    }
  }

  async checkModel(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      if (!response.ok) return false;

      const data = await response.json();
      const models = data.models || [];
      return models.some(
        (m: { name: string }) =>
          m.name === this.model || m.name.startsWith(this.model.split(':')[0])
      );
    } catch {
      return false;
    }
  }

  async listAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      if (!response.ok) return [];

      const data = await response.json();
      const models = data.models || [];

      // Filter für Code-Modelle
      const codeModelNames = CODE_MODELS.map((m) => m.name.split(':')[0]);
      return models
        .filter((m: { name: string }) =>
          codeModelNames.some((name) => m.name.includes(name))
        )
        .map((m: { name: string }) => m.name);
    } catch {
      return [];
    }
  }

  setModel(model: string): void {
    this.model = model;
  }

  getModel(): string {
    return this.model;
  }
}

// Singleton für einfache Verwendung
export const codeAssistant = new CodeAssistantService();
