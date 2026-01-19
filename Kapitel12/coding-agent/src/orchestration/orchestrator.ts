/**
 * Agent Orchestrator - Koordiniert Agent-Ausführung
 * Kapitel 11: Architektur eines Programmierautomaten
 */

import {
  Task,
  TaskStep,
  TaskPlan,
  PlannedStep,
  TaskResult,
} from "../types/task.js";
import {
  PlannerAgent,
  CoderAgent,
  TesterAgent,
  ReviewerAgent,
  BaseAgent,
  AgentContext,
  AgentConfig,
} from "../agents/index.js";
import { OllamaClient } from "../llm/ollama-client.js";
import { createStandardTools, Tool } from "../tools/index.js";
import { ModelRouter } from "../models/model-router.js";

export interface OrchestratorConfig {
  projectRoot: string;
  maxRetries: number;
  ollamaBaseUrl: string;
  models: {
    planner: string;
    coder: string;
    tester: string;
    reviewer: string;
  };
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  projectRoot: process.cwd(),
  maxRetries: 3,
  ollamaBaseUrl: "http://localhost:11434",
  models: {
    planner: "llama3.2",
    coder: "qwen2.5-coder:7b",
    tester: "llama3.2",
    reviewer: "llama3.2",
  },
};

export class AgentOrchestrator {
  private planner: PlannerAgent;
  private coder: CoderAgent;
  private tester: TesterAgent;
  private reviewer: ReviewerAgent;
  private config: OrchestratorConfig;
  private llmClient: OllamaClient;
  private modelRouter: ModelRouter;
  private tools: Tool[];

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.llmClient = new OllamaClient({ baseUrl: this.config.ollamaBaseUrl });
    this.modelRouter = new ModelRouter();
    this.tools = createStandardTools(this.config.projectRoot);

    this.initializeAgents();
  }

  /**
   * Führt einen Task vollständig aus
   */
  async executeTask(task: Task): Promise<Task> {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Starting task: ${task.title}`);
    console.log(`Type: ${task.type}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      // Phase 1: Planung
      console.log("\n📋 Phase 1: Planning...\n");
      task.status = "planning";
      task.updatedAt = new Date();

      const plan = await this.planTask(task);
      task.plan = plan;

      console.log(`\nPlan created:`);
      console.log(`  Summary: ${plan.summary}`);
      console.log(`  Steps: ${plan.steps.length}`);
      console.log(`  Complexity: ${plan.estimatedComplexity}`);

      // Phase 2: Ausführung
      console.log("\n🔨 Phase 2: Executing...\n");
      task.status = "executing";
      task.updatedAt = new Date();

      for (let i = 0; i < plan.steps.length; i++) {
        const plannedStep = plan.steps[i];
        task.currentStep = i;

        console.log(`\n--- Step ${i + 1}/${plan.steps.length}: ${plannedStep.description} ---\n`);

        const step = await this.executeStep(task, plannedStep, i);
        task.steps.push(step);

        if (step.status === "failed") {
          console.log(`Step ${i + 1} failed: ${step.error}`);

          if (task.retryCount < task.maxRetries) {
            task.retryCount++;
            console.log(`Retrying (${task.retryCount}/${task.maxRetries})...`);
            i--; // Schritt wiederholen
            continue;
          }

          task.status = "failed";
          task.result = {
            success: false,
            summary: `Task failed at step ${i + 1}: ${step.error}`,
            filesChanged: this.getChangedFiles(task),
            testsRun: 0,
            testsPassed: 0,
          };
          return task;
        }

        console.log(`Step ${i + 1} completed successfully`);
      }

      // Phase 3: Validierung
      console.log("\n✅ Phase 3: Validating...\n");
      task.status = "validating";
      task.updatedAt = new Date();

      const validationResult = await this.validateTask(task);

      if (!validationResult.success) {
        console.log(`Validation failed: ${validationResult.errors.join(", ")}`);

        if (task.retryCount < task.maxRetries) {
          task.retryCount++;
          console.log(`Retrying full task (${task.retryCount}/${task.maxRetries})...`);
          task.steps = [];
          return this.executeTask(task);
        }

        task.status = "failed";
        task.result = {
          success: false,
          summary: `Validation failed: ${validationResult.errors.join(", ")}`,
          filesChanged: this.getChangedFiles(task),
          testsRun: 0,
          testsPassed: 0,
        };
        return task;
      }

      // Phase 4: Review (optional)
      if (this.shouldReview(task)) {
        console.log("\n🔍 Phase 4: Reviewing...\n");
        task.status = "reviewing";
        task.updatedAt = new Date();

        const reviewResult = await this.reviewTask(task);
        console.log(`Review: ${reviewResult.success ? "Approved" : "Changes requested"}`);
      }

      // Erfolgreich abgeschlossen
      task.status = "completed";
      task.completedAt = new Date();
      task.updatedAt = new Date();
      task.result = this.buildResult(task);

      console.log(`\n${"=".repeat(60)}`);
      console.log(`Task completed successfully!`);
      console.log(`Files changed: ${task.result.filesChanged.length}`);
      console.log(`${"=".repeat(60)}\n`);

      return task;
    } catch (error) {
      console.error(`\nTask failed with error: ${error}`);

      task.status = "failed";
      task.updatedAt = new Date();
      task.result = {
        success: false,
        summary: `Task failed: ${error}`,
        filesChanged: [],
        testsRun: 0,
        testsPassed: 0,
      };
      return task;
    }
  }

  /**
   * Plant den Task
   */
  private async planTask(task: Task): Promise<TaskPlan> {
    const context = await this.buildContext(task, []);

    const result = await this.planner.execute({
      task,
      step: {
        order: 0,
        description: "Plan erstellen",
        type: "analyze",
        files: [],
      },
      context,
    });

    if (!result.success) {
      throw new Error(`Planning failed: ${result.result}`);
    }

    return JSON.parse(result.result);
  }

  /**
   * Führt einen einzelnen Schritt aus
   */
  private async executeStep(
    task: Task,
    plannedStep: PlannedStep,
    index: number
  ): Promise<TaskStep> {
    const step: TaskStep = {
      id: `${task.id}-step-${index}`,
      order: index,
      description: plannedStep.description,
      status: "running",
      agentType: this.getAgentType(plannedStep.type),
      toolCalls: [],
    };

    const startTime = Date.now();
    const agent = this.getAgent(plannedStep.type);
    const context = await this.buildContext(task, task.steps);

    try {
      const result = await agent.execute({
        task,
        step: plannedStep,
        context,
      });

      step.status = result.success ? "completed" : "failed";
      step.output = result.result;
      step.toolCalls = result.toolCalls;
      task.artifacts.push(...result.artifacts);
    } catch (error) {
      step.status = "failed";
      step.error = String(error);
    }

    step.duration = Date.now() - startTime;
    return step;
  }

  /**
   * Validiert den Task (Tests ausführen)
   */
  private async validateTask(
    task: Task
  ): Promise<{ success: boolean; errors: string[] }> {
    const context = await this.buildContext(task, task.steps);

    const result = await this.tester.execute({
      task,
      step: {
        order: -1,
        description: "Validierung",
        type: "validate",
        files: [],
      },
      context,
    });

    return {
      success: result.success,
      errors: result.success ? [] : [result.result],
    };
  }

  /**
   * Führt Code-Review durch
   */
  private async reviewTask(
    task: Task
  ): Promise<{ success: boolean }> {
    const context = await this.buildContext(task, task.steps);

    const result = await this.reviewer.execute({
      task,
      step: {
        order: -1,
        description: "Code-Review",
        type: "validate",
        files: [],
      },
      context,
    });

    return { success: result.success };
  }

  /**
   * Wählt den passenden Agent
   */
  private getAgent(stepType: string): BaseAgent {
    switch (stepType) {
      case "analyze":
        return this.planner;
      case "code":
        return this.coder;
      case "test":
        return this.tester;
      case "validate":
        return this.reviewer;
      default:
        return this.coder;
    }
  }

  /**
   * Mappt Step-Typ auf Agent-Typ
   */
  private getAgentType(stepType: string): TaskStep["agentType"] {
    const mapping: Record<string, TaskStep["agentType"]> = {
      analyze: "planner",
      code: "coder",
      test: "tester",
      validate: "reviewer",
    };
    return mapping[stepType] || "coder";
  }

  /**
   * Baut den Agent-Kontext
   */
  private async buildContext(
    task: Task,
    previousSteps: TaskStep[]
  ): Promise<AgentContext> {
    return {
      messages: [],
      fileContents: new Map(),
      codebaseStructure: await this.getCodebaseStructure(task.context.projectPath),
      previousSteps,
    };
  }

  /**
   * Holt die Codebase-Struktur
   */
  private async getCodebaseStructure(projectPath: string): Promise<string> {
    const { execSync } = await import("child_process");
    try {
      return execSync(
        'find . -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) | grep -v node_modules | head -50',
        { cwd: projectPath, encoding: "utf-8" }
      );
    } catch {
      return "";
    }
  }

  /**
   * Entscheidet ob Review nötig ist
   */
  private shouldReview(task: Task): boolean {
    return (
      task.type === "feature" || task.plan?.estimatedComplexity === "high"
    );
  }

  /**
   * Baut das Task-Ergebnis
   */
  private buildResult(task: Task): TaskResult {
    const filesChanged = this.getChangedFiles(task);
    const testArtifact = task.artifacts.find((a) => a.type === "test_result");
    const testResults = testArtifact
      ? JSON.parse(testArtifact.content)
      : null;

    return {
      success: true,
      summary: `Task completed: ${task.plan?.summary || task.title}`,
      filesChanged,
      testsRun: testResults?.total || 0,
      testsPassed: testResults?.passed || 0,
    };
  }

  /**
   * Extrahiert geänderte Dateien
   */
  private getChangedFiles(task: Task): string[] {
    return task.artifacts
      .filter((a) => a.type === "file" && a.path)
      .map((a) => a.path!)
      .filter((v, i, a) => a.indexOf(v) === i); // Unique
  }

  /**
   * Initialisiert alle Agents
   */
  private initializeAgents(): void {
    const baseConfig = {
      maxIterations: 10,
      temperature: 0.7,
      tools: this.tools,
    };

    this.planner = new PlannerAgent(
      {
        ...baseConfig,
        name: "Planner",
        model: this.config.models.planner,
        systemPrompt: "",
        maxIterations: 5,
      },
      this.llmClient
    );

    this.coder = new CoderAgent(
      {
        ...baseConfig,
        name: "Coder",
        model: this.config.models.coder,
        systemPrompt: "",
      },
      this.llmClient
    );

    this.tester = new TesterAgent(
      {
        ...baseConfig,
        name: "Tester",
        model: this.config.models.tester,
        systemPrompt: "",
      },
      this.llmClient
    );

    this.reviewer = new ReviewerAgent(
      {
        ...baseConfig,
        name: "Reviewer",
        model: this.config.models.reviewer,
        systemPrompt: "",
        maxIterations: 3,
      },
      this.llmClient
    );
  }
}
