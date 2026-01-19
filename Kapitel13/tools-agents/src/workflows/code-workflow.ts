/**
 * Orchestrierter Code-Workflow
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 *
 * Im Gegensatz zum ReAct-Agent folgt der Workflow vordefinierten Schritten.
 * Mehr Vorhersagbarkeit, weniger Flexibilität.
 */

import { OllamaClient, ChatMessage, systemMessage, userMessage } from '../llm/ollama-client.js';
import { ToolRegistry, ToolDefinition, ToolResult } from '../tools/index.js';

// ============================================================================
// Types
// ============================================================================

export interface WorkflowStep {
  /** Step-Name */
  name: string;
  /** Agent-Rolle */
  agent: 'planner' | 'coder' | 'tester' | 'reviewer';
  /** Prompt-Template */
  prompt: string;
  /** Erlaubte Tools */
  tools: string[];
  /** Validierung */
  validation?: (result: StepResult) => boolean;
  /** Optional: Wird übersprungen wenn Bedingung erfüllt */
  skipIf?: (previousResults: StepResult[]) => boolean;
}

export interface StepResult {
  step: string;
  success: boolean;
  summary: string;
  toolCalls: Array<{
    tool: string;
    args: Record<string, unknown>;
    result: ToolResult;
  }>;
  duration: number;
  retryable: boolean;
  retries: number;
}

export interface WorkflowResult {
  success: boolean;
  message: string;
  steps: StepResult[];
  totalDuration: number;
}

export interface WorkflowConfig {
  /** Modelle pro Agent-Rolle */
  models?: Record<string, string>;
  /** Max Retries pro Step */
  maxRetries?: number;
  /** Verbose Logging */
  verbose?: boolean;
}

// ============================================================================
// Code Workflow
// ============================================================================

export class CodeWorkflow {
  private client: OllamaClient;
  private tools: ToolRegistry;
  private config: Required<WorkflowConfig>;

  constructor(client: OllamaClient, tools: ToolRegistry, config: WorkflowConfig = {}) {
    this.client = client;
    this.tools = tools;
    this.config = {
      models: config.models || {
        planner: 'llama3.2',
        coder: 'qwen2.5-coder:14b',
        tester: 'llama3.2',
        reviewer: 'llama3.2'
      },
      maxRetries: config.maxRetries ?? 2,
      verbose: config.verbose ?? false
    };
  }

  /**
   * Workflow ausführen
   */
  async execute(task: string): Promise<WorkflowResult> {
    const startTime = Date.now();
    const steps = this.buildSteps(task);
    const results: StepResult[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Skip-Bedingung prüfen
      if (step.skipIf && step.skipIf(results)) {
        if (this.config.verbose) {
          console.log(`\n[SKIP] Step ${i + 1}: ${step.name}`);
        }
        continue;
      }

      if (this.config.verbose) {
        console.log(`\n========================================`);
        console.log(`Step ${i + 1}: ${step.name}`);
        console.log(`Agent: ${step.agent}`);
        console.log(`========================================`);
      }

      let result = await this.executeStep(step, results);
      results.push(result);

      // Retry bei Fehler
      if (!result.success && result.retryable) {
        for (let retry = 1; retry <= this.config.maxRetries; retry++) {
          if (this.config.verbose) {
            console.log(`\nRetry ${retry}/${this.config.maxRetries}...`);
          }

          result = await this.executeStep(step, results, retry);
          results[results.length - 1] = result;

          if (result.success) break;
        }
      }

      // Bei endgültigem Fehler abbrechen
      if (!result.success) {
        return {
          success: false,
          message: `Workflow failed at step: ${step.name}`,
          steps: results,
          totalDuration: Date.now() - startTime
        };
      }
    }

    return {
      success: true,
      message: 'Workflow completed successfully',
      steps: results,
      totalDuration: Date.now() - startTime
    };
  }

  /**
   * Workflow-Schritte definieren
   */
  private buildSteps(task: string): WorkflowStep[] {
    return [
      {
        name: 'Analyse',
        agent: 'planner',
        prompt: `Analysiere diese Aufgabe und identifiziere die relevanten Dateien:

${task}

Schritte:
1. Liste das Projektverzeichnis auf
2. Identifiziere relevante Dateien
3. Lies die wichtigsten Dateien
4. Erstelle einen Analyseplan`,
        tools: ['list_directory', 'read_file', 'search_code']
      },
      {
        name: 'Implementierung',
        agent: 'coder',
        prompt: `Implementiere die Änderungen basierend auf der Analyse:

${task}

Regeln:
- Lies Dateien BEVOR du sie änderst
- Kleine, fokussierte Änderungen
- Folge bestehenden Patterns`,
        tools: ['read_file', 'write_file', 'patch_file', 'search_code']
      },
      {
        name: 'Type-Check',
        agent: 'tester',
        prompt: 'Führe Type-Checking durch und behebe Fehler falls nötig.',
        tools: ['type_check', 'read_file', 'patch_file'],
        validation: (result) => {
          // Erfolgreich wenn keine Type-Errors
          const hasErrors = result.toolCalls.some(
            tc => tc.tool === 'type_check' && !tc.result.success
          );
          return !hasErrors;
        },
        skipIf: (results) => {
          // Überspringen wenn keine Dateien geändert wurden
          const implStep = results.find(r => r.step === 'Implementierung');
          if (!implStep) return false;
          const hasWrites = implStep.toolCalls.some(
            tc => tc.tool === 'write_file' || tc.tool === 'patch_file'
          );
          return !hasWrites;
        }
      },
      {
        name: 'Lint',
        agent: 'tester',
        prompt: 'Führe Linting durch und behebe Probleme.',
        tools: ['lint', 'read_file', 'patch_file'],
        skipIf: (results) => {
          const implStep = results.find(r => r.step === 'Implementierung');
          if (!implStep) return false;
          const hasWrites = implStep.toolCalls.some(
            tc => tc.tool === 'write_file' || tc.tool === 'patch_file'
          );
          return !hasWrites;
        }
      },
      {
        name: 'Tests',
        agent: 'tester',
        prompt: 'Führe Tests aus und prüfe ob alles funktioniert.',
        tools: ['run_tests'],
        validation: (result) => {
          const testResult = result.toolCalls.find(tc => tc.tool === 'run_tests');
          if (!testResult) return true;
          const output = testResult.result.output as { success?: boolean; results?: { failed?: number } };
          return output?.success === true || output?.results?.failed === 0;
        }
      },
      {
        name: 'Review',
        agent: 'reviewer',
        prompt: 'Prüfe die Änderungen auf Qualität und Best Practices.',
        tools: ['git_diff', 'read_file', 'git_status']
      }
    ];
  }

  /**
   * Einzelnen Step ausführen
   */
  private async executeStep(
    step: WorkflowStep,
    previousResults: StepResult[],
    retryCount: number = 0
  ): Promise<StepResult> {
    const startTime = Date.now();

    // Kontext aus vorherigen Schritten
    const context = previousResults
      .map(r => `${r.step}: ${r.summary}`)
      .join('\n');

    // Tool-Definitionen filtern
    const stepTools: ToolDefinition[] = step.tools
      .map(name => this.tools.get(name)?.definition)
      .filter((t): t is ToolDefinition => t !== undefined);

    // Prompt mit Kontext
    const fullPrompt = context
      ? `${step.prompt}\n\nBisheriger Kontext:\n${context}`
      : step.prompt;

    const messages: ChatMessage[] = [
      systemMessage(this.getAgentPrompt(step.agent)),
      userMessage(fullPrompt)
    ];

    const toolCalls: StepResult['toolCalls'] = [];

    try {
      const result = await this.client.chatWithTools({
        model: this.config.models[step.agent] || 'llama3.2',
        messages,
        tools: stepTools,
        toolExecutor: async (name, args) => {
          const toolResult = await this.tools.execute(name, args);
          toolCalls.push({ tool: name, args, result: toolResult });
          return toolResult;
        }
      });

      const stepResult: StepResult = {
        step: step.name,
        success: true,
        summary: result.response.slice(0, 500),
        toolCalls,
        duration: Date.now() - startTime,
        retryable: true,
        retries: retryCount
      };

      // Validation ausführen
      if (step.validation) {
        stepResult.success = step.validation(stepResult);
      }

      if (this.config.verbose) {
        console.log(`\nResult: ${stepResult.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`Summary: ${stepResult.summary.slice(0, 200)}...`);
      }

      return stepResult;

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        step: step.name,
        success: false,
        summary: `Error: ${message}`,
        toolCalls,
        duration: Date.now() - startTime,
        retryable: true,
        retries: retryCount
      };
    }
  }

  /**
   * Agent-spezifische System-Prompts
   */
  private getAgentPrompt(agent: string): string {
    const prompts: Record<string, string> = {
      planner: `Du bist ein erfahrener Software-Architekt.
Analysiere Aufgaben und identifiziere die relevanten Code-Bereiche.
Erstelle klare, strukturierte Analysepläne.`,

      coder: `Du bist ein Senior Developer.
Schreibe sauberen, wartbaren Code.
Folge bestehenden Patterns im Projekt.
Lies IMMER Dateien bevor du sie änderst.`,

      tester: `Du bist ein QA-Engineer.
Stelle sicher, dass der Code korrekt und fehlerfrei ist.
Behebe Fehler wenn nötig.`,

      reviewer: `Du bist ein Code-Reviewer.
Prüfe auf Best Practices und potenzielle Probleme.
Gib konstruktives Feedback.`
    };

    return prompts[agent] || prompts.coder;
  }

  /**
   * Custom Steps hinzufügen
   */
  addStep(step: WorkflowStep, position?: number): void {
    // Implementation für Erweiterbarkeit
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Erstellt einen Standard-Workflow
 */
export function createCodeWorkflow(
  projectRoot: string,
  config: WorkflowConfig & { ollamaUrl?: string } = {}
): CodeWorkflow {
  const { createDefaultRegistry } = require('../tools/index.js');

  const client = new OllamaClient(
    config.ollamaUrl || 'http://localhost:11434'
  );

  const tools = createDefaultRegistry(projectRoot);

  return new CodeWorkflow(client, tools, config);
}
