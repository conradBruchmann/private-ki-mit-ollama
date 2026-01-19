/**
 * Model Router - Intelligente Modell-Auswahl
 * Kapitel 11: Architektur eines Programmierautomaten
 */

export interface ModelConfig {
  name: string;
  contextLength: number;
  strengths: string[];
  costPerToken: number;
}

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  "llama3.2": {
    name: "llama3.2",
    contextLength: 128000,
    strengths: ["general", "reasoning", "planning"],
    costPerToken: 1,
  },
  "llama3.2:3b": {
    name: "llama3.2:3b",
    contextLength: 128000,
    strengths: ["fast", "simple-tasks"],
    costPerToken: 0.3,
  },
  "qwen2.5-coder:14b": {
    name: "qwen2.5-coder:14b",
    contextLength: 32000,
    strengths: ["code", "debugging", "refactoring"],
    costPerToken: 1.5,
  },
  "qwen2.5-coder:7b": {
    name: "qwen2.5-coder:7b",
    contextLength: 32000,
    strengths: ["code", "fast"],
    costPerToken: 0.8,
  },
  "deepseek-coder-v2": {
    name: "deepseek-coder-v2",
    contextLength: 128000,
    strengths: ["code", "large-context"],
    costPerToken: 1.2,
  },
  "codellama": {
    name: "codellama",
    contextLength: 16000,
    strengths: ["code", "infill"],
    costPerToken: 0.7,
  },
};

export type TaskTypeForRouting =
  | "planning"
  | "code"
  | "refactor"
  | "bugfix"
  | "test"
  | "review"
  | "analyze";

export type Complexity = "low" | "medium" | "high";

export class ModelRouter {
  private availableModels: string[];

  constructor(availableModels?: string[]) {
    this.availableModels = availableModels || Object.keys(AVAILABLE_MODELS);
  }

  /**
   * Wählt das beste Modell für die Aufgabe
   */
  selectModel(
    taskType: TaskTypeForRouting,
    complexity: Complexity,
    contextSize: number
  ): string {
    // Code-Aufgaben → Code-Modell
    if (["code", "refactor", "bugfix", "test"].includes(taskType)) {
      if (complexity === "high" || contextSize > 30000) {
        return this.findAvailable(["deepseek-coder-v2", "qwen2.5-coder:14b"]);
      }
      return this.findAvailable(["qwen2.5-coder:7b", "qwen2.5-coder:14b", "codellama"]);
    }

    // Planung und Review → Reasoning-Modell
    if (["planning", "review", "analyze"].includes(taskType)) {
      return this.findAvailable(["llama3.2", "qwen2.5-coder:14b"]);
    }

    // Einfache Aufgaben → Schnelles Modell
    if (complexity === "low") {
      return this.findAvailable(["llama3.2:3b", "llama3.2"]);
    }

    // Default
    return this.findAvailable(["llama3.2", "qwen2.5-coder:7b"]);
  }

  /**
   * Findet das erste verfügbare Modell aus der Liste
   */
  private findAvailable(preferences: string[]): string {
    for (const model of preferences) {
      if (this.availableModels.some((m) => m.startsWith(model))) {
        return model;
      }
    }
    // Fallback: Erstes verfügbares Modell
    return this.availableModels[0] || "llama3.2";
  }

  /**
   * Schätzt Token-Anzahl aus Text
   */
  estimateTokens(text: string): number {
    // Grobe Schätzung: 1 Token ≈ 4 Zeichen (für Englisch/Code)
    // Für Deutsch etwas mehr: 1 Token ≈ 3.5 Zeichen
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Prüft ob der Kontext ins Modell passt
   */
  checkContextFit(model: string, tokens: number): boolean {
    const config = AVAILABLE_MODELS[model];
    if (!config) return true; // Unbekanntes Modell, optimistisch annehmen

    // 80% des Kontexts als sicheres Limit
    return tokens < config.contextLength * 0.8;
  }

  /**
   * Wählt automatisch Modell mit passendem Kontext
   */
  selectModelWithContext(
    taskType: TaskTypeForRouting,
    complexity: Complexity,
    contextText: string
  ): string {
    const tokens = this.estimateTokens(contextText);
    const preferredModel = this.selectModel(taskType, complexity, tokens);

    if (this.checkContextFit(preferredModel, tokens)) {
      return preferredModel;
    }

    // Fallback zu größerem Kontext-Modell
    return this.findAvailable(["deepseek-coder-v2", "llama3.2"]);
  }

  /**
   * Aktualisiert verfügbare Modelle
   */
  setAvailableModels(models: string[]): void {
    this.availableModels = models;
  }
}
