/**
 * ReAct Agent Implementation
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 *
 * ReAct = Reasoning + Acting
 * Der Agent denkt laut nach (Reasoning) und führt dann Tools aus (Acting).
 */

import { OllamaClient, ChatMessage, systemMessage, userMessage } from '../llm/ollama-client.js';
import { ToolRegistry, ToolResult } from '../tools/index.js';

// ============================================================================
// Types
// ============================================================================

export interface ReactAgentConfig {
  /** LLM-Modell */
  model: string;
  /** System-Prompt */
  systemPrompt?: string;
  /** Maximale Iterationen (Tool-Aufrufe) */
  maxIterations: number;
  /** Verbose Logging */
  verbose: boolean;
  /** Temperatur für LLM */
  temperature: number;
  /** Timeout pro Iteration in ms */
  iterationTimeout?: number;
}

export interface AgentTrace {
  iteration: number;
  thought: string | null;
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
  toolResults?: Array<{
    tool: string;
    input: Record<string, unknown>;
    output: ToolResult;
    duration: number;
  }>;
}

export interface AgentResult {
  success: boolean;
  response: string;
  iterations: number;
  trace: AgentTrace[];
  totalDuration: number;
  error?: string;
}

export interface AgentCallbacks {
  /** Vor jeder Iteration */
  onIteration?: (iteration: number) => void;
  /** Bei jedem Tool-Aufruf */
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  /** Nach jedem Tool-Ergebnis */
  onToolResult?: (name: string, result: ToolResult) => void;
  /** Bei LLM-Thought */
  onThought?: (thought: string) => void;
}

// ============================================================================
// ReAct Agent
// ============================================================================

export class ReactAgent {
  private client: OllamaClient;
  private tools: ToolRegistry;
  private config: ReactAgentConfig;

  constructor(
    client: OllamaClient,
    tools: ToolRegistry,
    config: Partial<ReactAgentConfig> = {}
  ) {
    this.client = client;
    this.tools = tools;
    this.config = {
      model: config.model || 'llama3.2',
      systemPrompt: config.systemPrompt,
      maxIterations: config.maxIterations ?? 15,
      verbose: config.verbose ?? false,
      temperature: config.temperature ?? 0.7,
      iterationTimeout: config.iterationTimeout
    };
  }

  /**
   * Führt eine Aufgabe aus
   */
  async run(task: string, callbacks?: AgentCallbacks): Promise<AgentResult> {
    const startTime = Date.now();
    const systemPrompt = this.config.systemPrompt || this.defaultSystemPrompt();

    const messages: ChatMessage[] = [
      systemMessage(systemPrompt),
      userMessage(task)
    ];

    const trace: AgentTrace[] = [];

    for (let iteration = 1; iteration <= this.config.maxIterations; iteration++) {
      callbacks?.onIteration?.(iteration);

      if (this.config.verbose) {
        console.log(`\n--- Iteration ${iteration} ---`);
      }

      try {
        // LLM-Aufruf
        const response = await this.client.chat({
          model: this.config.model,
          messages,
          tools: this.tools.getDefinitions(),
          temperature: this.config.temperature
        });

        const thought = response.message.content;
        const toolCalls = response.message.tool_calls || [];

        // Thought loggen
        if (thought && this.config.verbose) {
          console.log('Thought:', thought.slice(0, 200) + (thought.length > 200 ? '...' : ''));
        }
        callbacks?.onThought?.(thought || '');

        // Trace aktualisieren
        const traceEntry: AgentTrace = {
          iteration,
          thought,
          toolCalls: toolCalls.map(tc => ({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || '{}')
          }))
        };
        trace.push(traceEntry);

        // Keine Tool-Calls → Aufgabe abgeschlossen
        if (toolCalls.length === 0) {
          if (this.config.verbose) {
            console.log('Agent finished');
          }

          return {
            success: true,
            response: thought || '',
            iterations: iteration,
            trace,
            totalDuration: Date.now() - startTime
          };
        }

        // Tool-Calls zur Konversation hinzufügen
        messages.push(response.message);

        // Tools ausführen
        const toolResults: AgentTrace['toolResults'] = [];

        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          let toolArgs: Record<string, unknown>;

          try {
            toolArgs = JSON.parse(toolCall.function.arguments || '{}');
          } catch {
            toolArgs = {};
          }

          callbacks?.onToolCall?.(toolName, toolArgs);

          if (this.config.verbose) {
            console.log(`Tool: ${toolName}`, JSON.stringify(toolArgs).slice(0, 100));
          }

          // Tool ausführen
          const toolStart = Date.now();
          const result = await this.tools.execute(toolName, toolArgs);
          const toolDuration = Date.now() - toolStart;

          callbacks?.onToolResult?.(toolName, result);

          if (this.config.verbose) {
            console.log('Result:', result.success ? 'OK' : result.error);
          }

          toolResults.push({
            tool: toolName,
            input: toolArgs,
            output: result,
            duration: toolDuration
          });

          // Ergebnis zur Konversation hinzufügen
          messages.push({
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: toolCall.id
          });
        }

        // Trace aktualisieren
        traceEntry.toolResults = toolResults;

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (this.config.verbose) {
          console.error('Error:', message);
        }

        return {
          success: false,
          response: '',
          iterations: iteration,
          trace,
          totalDuration: Date.now() - startTime,
          error: message
        };
      }
    }

    // Max Iterations erreicht
    return {
      success: false,
      response: '',
      iterations: this.config.maxIterations,
      trace,
      totalDuration: Date.now() - startTime,
      error: `Max iterations (${this.config.maxIterations}) reached`
    };
  }

  /**
   * Standard System-Prompt
   */
  private defaultSystemPrompt(): string {
    const toolList = this.tools.list().map(t => {
      const info = this.tools.getInfo(t);
      return info ? `- ${t}: ${info.description}` : `- ${t}`;
    }).join('\n');

    return `Du bist ein autonomer Entwickler-Agent mit Zugriff auf verschiedene Tools.

VERFÜGBARE TOOLS:
${toolList}

ARBEITSWEISE:
1. Analysiere die Aufgabe
2. Plane die notwendigen Schritte
3. Führe Schritte nacheinander aus, nutze Tools wenn nötig
4. Validiere dein Ergebnis
5. Gib eine Zusammenfassung, wenn du fertig bist

REGELN:
- Lies IMMER zuerst relevante Dateien, bevor du sie änderst
- Prüfe nach Änderungen mit type_check und lint (falls verfügbar)
- Erstelle keine Dateien, die nicht benötigt werden
- Bei Fehlern: Analysiere, verstehe, behebe
- Keine Commits ohne explizite Aufforderung

WICHTIG:
- Wenn du fertig bist, antworte mit einer Zusammenfassung deiner Änderungen
- Nutze KEINE Tools mehr, wenn die Aufgabe erledigt ist
- Bleibe fokussiert auf die gestellte Aufgabe`;
  }

  /**
   * Konfiguration ändern
   */
  configure(config: Partial<ReactAgentConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Tools abrufen
   */
  getTools(): ToolRegistry {
    return this.tools;
  }

  /**
   * Client abrufen
   */
  getClient(): OllamaClient {
    return this.client;
  }
}

// ============================================================================
// Agent Factory Functions
// ============================================================================

/**
 * Erstellt einen Standard-Agent
 */
export function createAgent(
  projectRoot: string,
  options: {
    model?: string;
    ollamaUrl?: string;
    maxIterations?: number;
    verbose?: boolean;
  } = {}
): ReactAgent {
  const { createDefaultRegistry } = require('../tools/index.js');

  const client = new OllamaClient(
    options.ollamaUrl || 'http://localhost:11434',
    options.model || 'llama3.2'
  );

  const tools = createDefaultRegistry(projectRoot);

  return new ReactAgent(client, tools, {
    model: options.model,
    maxIterations: options.maxIterations,
    verbose: options.verbose
  });
}

/**
 * Erstellt einen Read-Only Agent (nur Analyse)
 */
export function createReadOnlyAgent(
  projectRoot: string,
  options: {
    model?: string;
    ollamaUrl?: string;
  } = {}
): ReactAgent {
  const { createReadOnlyRegistry } = require('../tools/index.js');

  const client = new OllamaClient(
    options.ollamaUrl || 'http://localhost:11434',
    options.model || 'llama3.2'
  );

  const tools = createReadOnlyRegistry(projectRoot);

  return new ReactAgent(client, tools, {
    model: options.model,
    systemPrompt: `Du bist ein Code-Analyst. Du kannst Code lesen und analysieren, aber KEINE Änderungen vornehmen.

VERFÜGBARE TOOLS (nur Lesen):
${tools.list().join(', ')}

Analysiere den Code gründlich und gib hilfreiche Informationen.`
  });
}
