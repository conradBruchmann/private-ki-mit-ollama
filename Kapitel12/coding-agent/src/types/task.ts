/**
 * Task-Typdefinitionen
 * Kapitel 11: Architektur eines Programmierautomaten
 */

export type TaskStatus =
  | "created"
  | "planning"
  | "executing"
  | "validating"
  | "reviewing"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskType =
  | "feature"   // Neue Funktionalität
  | "bugfix"    // Fehlerbehebung
  | "refactor"  // Code-Verbesserung
  | "test"      // Tests schreiben
  | "docs"      // Dokumentation
  | "review";   // Code-Review

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  title: string;
  description: string;

  // Kontext
  context: TaskContext;

  // Planung
  plan?: TaskPlan;

  // Ausführung
  steps: TaskStep[];
  currentStep: number;

  // Ergebnis
  artifacts: Artifact[];
  result?: TaskResult;

  // Metadaten
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export interface TaskContext {
  // Projekt-Informationen
  projectPath: string;
  language: string;
  framework?: string;

  // Relevante Dateien
  relevantFiles: string[];

  // Zusätzlicher Kontext
  userInstructions?: string;
  codebaseContext?: string;

  // Constraints
  constraints?: {
    maxFileChanges?: number;
    allowNewFiles?: boolean;
    allowDeleteFiles?: boolean;
    targetBranch?: string;
  };
}

export interface TaskPlan {
  summary: string;
  approach: string;
  steps: PlannedStep[];
  estimatedComplexity: "low" | "medium" | "high";
  risks: string[];
}

export interface PlannedStep {
  order: number;
  description: string;
  type: "analyze" | "code" | "test" | "validate";
  files: string[];
}

export interface TaskStep {
  id: string;
  order: number;
  description: string;
  status: "pending" | "running" | "completed" | "failed";

  // Ausführung
  agentType: "planner" | "coder" | "reviewer" | "tester";
  toolCalls: ToolCall[];

  // Ergebnis
  output?: string;
  error?: string;
  duration?: number;
}

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  timestamp: Date;
}

export interface Artifact {
  type: "file" | "diff" | "test_result" | "documentation";
  path?: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface TaskResult {
  success: boolean;
  summary: string;
  filesChanged: string[];
  testsRun: number;
  testsPassed: number;
  coverage?: number;
  commitSha?: string;
}

// Factory-Funktionen
export function createTask(
  type: TaskType,
  title: string,
  description: string,
  context: TaskContext
): Task {
  return {
    id: generateTaskId(),
    type,
    status: "created",
    title,
    description,
    context,
    steps: [],
    currentStep: 0,
    artifacts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    retryCount: 0,
    maxRetries: 3,
  };
}

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
