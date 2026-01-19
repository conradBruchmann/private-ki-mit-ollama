/**
 * Base Agent
 * Kapitel 11: Architektur eines Programmierautomaten
 */

import { Message, ToolDefinition } from "../types/message.js";
import { Task, PlannedStep, TaskStep, ToolCall, Artifact } from "../types/task.js";
import { Tool, ToolExecutor } from "../tools/types.js";
import { OllamaClient } from "../llm/ollama-client.js";

export interface AgentConfig {
  name: string;
  model: string;
  systemPrompt: string;
  tools: Tool[];
  maxIterations: number;
  temperature: number;
}

export interface AgentInput {
  task: Task;
  step: PlannedStep;
  context: AgentContext;
}

export interface AgentContext {
  messages: Message[];
  fileContents: Map<string, string>;
  codebaseStructure: string;
  previousSteps: TaskStep[];
}

export interface AgentOutput {
  success: boolean;
  result: string;
  toolCalls: ToolCall[];
  artifacts: Artifact[];
  nextAction?: "continue" | "wait_for_review" | "done";
}

interface AgentLoopResult {
  success: boolean;
  finalResponse: string;
  toolCalls: ToolCall[];
  iterations: number;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected llmClient: OllamaClient;
  protected toolExecutor: ToolExecutor;

  constructor(config: AgentConfig, llmClient: OllamaClient) {
    this.config = config;
    this.llmClient = llmClient;
    this.toolExecutor = new ToolExecutor(config.tools);
  }

  abstract execute(input: AgentInput): Promise<AgentOutput>;

  /**
   * Agent-Loop: LLM aufrufen, Tools ausführen, wiederholen
   */
  protected async runAgentLoop(
    messages: Message[],
    maxIterations: number = this.config.maxIterations
  ): Promise<AgentLoopResult> {
    const toolCalls: ToolCall[] = [];
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;
      console.log(`  [${this.config.name}] Iteration ${iterations}/${maxIterations}`);

      // LLM aufrufen
      const response = await this.llmClient.chat({
        model: this.config.model,
        messages,
        tools: this.config.tools.map((t) => t.definition),
        temperature: this.config.temperature,
      });

      // Keine Tool-Aufrufe mehr → fertig
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return {
          success: true,
          finalResponse: response.content,
          toolCalls,
          iterations,
        };
      }

      // Assistant-Response zur Konversation hinzufügen
      messages.push({
        role: "assistant",
        content: response.content,
        toolCalls: response.toolCalls,
      });

      // Tools ausführen
      for (const call of response.toolCalls) {
        console.log(`  [${this.config.name}] Tool: ${call.function.name}`);

        const result = await this.toolExecutor.execute({
          name: call.function.name,
          arguments: call.function.arguments,
        });

        toolCalls.push({
          tool: call.function.name,
          input: JSON.parse(call.function.arguments),
          output: result.success ? result.output : undefined,
          error: result.success ? undefined : result.error,
          timestamp: new Date(),
        });

        // Tool-Ergebnis zur Konversation hinzufügen
        messages.push({
          role: "tool",
          toolCallId: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return {
      success: false,
      finalResponse: "Max iterations reached",
      toolCalls,
      iterations,
    };
  }

  /**
   * Extrahiert Datei-Artifacts aus Tool-Calls
   */
  protected extractFileArtifacts(toolCalls: ToolCall[]): Artifact[] {
    return toolCalls
      .filter((tc) => tc.tool === "write_file" && !tc.error)
      .map((tc) => ({
        type: "file" as const,
        path: tc.input.path as string,
        content: tc.input.content as string,
        metadata: { written: true },
      }));
  }
}
