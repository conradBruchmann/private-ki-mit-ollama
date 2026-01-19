/**
 * Feature Agent - Spezialisiert auf Feature-Entwicklung
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

import { OllamaClient } from '../llm/ollama-client.js';
import { createDefaultRegistry } from '../tools/index.js';
import { ReactAgent, AgentResult, AgentCallbacks } from './react-agent.js';

// ============================================================================
// Feature Agent Configuration
// ============================================================================

export interface FeatureAgentConfig {
  /** Projektverzeichnis */
  projectRoot: string;
  /** LLM-Modell (empfohlen: qwen2.5-coder:14b) */
  model?: string;
  /** Ollama Server URL */
  ollamaUrl?: string;
  /** Maximale Iterationen */
  maxIterations?: number;
  /** Verbose Logging */
  verbose?: boolean;
  /** Automatisch validieren (type_check, lint) */
  autoValidate?: boolean;
  /** Automatisch Git-Diff zeigen */
  showDiff?: boolean;
}

// ============================================================================
// Feature Agent
// ============================================================================

export class FeatureAgent {
  private agent: ReactAgent;
  private config: FeatureAgentConfig;

  constructor(config: FeatureAgentConfig) {
    this.config = {
      model: config.model || 'qwen2.5-coder:14b',
      ollamaUrl: config.ollamaUrl || 'http://localhost:11434',
      maxIterations: config.maxIterations || 20,
      verbose: config.verbose ?? true,
      autoValidate: config.autoValidate ?? true,
      showDiff: config.showDiff ?? true,
      ...config
    };

    const client = new OllamaClient(this.config.ollamaUrl, this.config.model);
    const tools = createDefaultRegistry(config.projectRoot);

    this.agent = new ReactAgent(client, tools, {
      model: this.config.model,
      maxIterations: this.config.maxIterations,
      verbose: this.config.verbose,
      systemPrompt: this.createSystemPrompt()
    });
  }

  /**
   * Feature implementieren
   */
  async implement(featureDescription: string, callbacks?: AgentCallbacks): Promise<AgentResult> {
    if (this.config.verbose) {
      console.log('\n========================================');
      console.log('Feature Agent');
      console.log('========================================');
      console.log('Feature:', featureDescription);
      console.log('Projekt:', this.config.projectRoot);
      console.log('Modell:', this.config.model);
      console.log('========================================\n');
    }

    return this.agent.run(featureDescription, callbacks);
  }

  /**
   * Bug fixen
   */
  async fixBug(bugDescription: string, callbacks?: AgentCallbacks): Promise<AgentResult> {
    const task = `Bug fixen: ${bugDescription}

Prozess:
1. Bug verstehen und reproduzieren (falls möglich)
2. Ursache finden
3. Fix implementieren
4. Validieren (type_check, lint, tests)`;

    return this.agent.run(task, callbacks);
  }

  /**
   * Code refactoren
   */
  async refactor(refactorDescription: string, callbacks?: AgentCallbacks): Promise<AgentResult> {
    const task = `Refactoring: ${refactorDescription}

Regeln:
- Keine funktionalen Änderungen (Verhalten bleibt gleich)
- Schrittweise vorgehen
- Nach jeder Änderung validieren
- Tests müssen weiterhin bestehen`;

    return this.agent.run(task, callbacks);
  }

  /**
   * System-Prompt für Feature-Entwicklung
   */
  private createSystemPrompt(): string {
    const validateInstructions = this.config.autoValidate
      ? `\n4. VALIDIERUNG
   - Prüfe Types (type_check)
   - Prüfe Linting (lint)
   - Führe Tests aus (run_tests)`
      : '';

    const diffInstructions = this.config.showDiff
      ? `\n5. ABSCHLUSS
   - Zeige git_diff
   - Gib Zusammenfassung`
      : `\n5. ABSCHLUSS
   - Gib Zusammenfassung der Änderungen`;

    return `Du bist ein autonomer Feature-Entwickler.

AUFGABE: Implementiere das beschriebene Feature vollständig.

PROZESS:
1. ANALYSE
   - Lies die relevanten Dateien
   - Verstehe die bestehende Architektur
   - Identifiziere wo Änderungen nötig sind

2. PLANUNG
   - Erstelle einen mentalen Plan
   - Überlege welche Dateien betroffen sind

3. IMPLEMENTIERUNG
   - Schreibe den Code schrittweise
   - Folge den bestehenden Patterns
   - Behandle Edge Cases
${validateInstructions}
${diffInstructions}

REGELN:
- Kleine, fokussierte Änderungen
- Bestehenden Code-Stil beibehalten
- Bei Fehlern: Analysieren, verstehen, beheben
- NICHT committen ohne Aufforderung
- Lies IMMER Dateien bevor du sie änderst

VERFÜGBARE TOOLS:
- read_file: Datei lesen
- write_file: Datei schreiben
- patch_file: Text in Datei ersetzen
- list_directory: Verzeichnis auflisten
- search_code: Code durchsuchen
- type_check: TypeScript prüfen
- lint: ESLint ausführen
- run_tests: Tests ausführen
- git_status: Git-Status zeigen
- git_diff: Änderungen zeigen

Wenn du fertig bist, gib eine kurze Zusammenfassung deiner Änderungen.`;
  }

  /**
   * Zugriff auf den internen Agent
   */
  getAgent(): ReactAgent {
    return this.agent;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Schnell ein Feature implementieren
 */
export async function createFeature(
  projectPath: string,
  featureDescription: string,
  options: Omit<FeatureAgentConfig, 'projectRoot'> = {}
): Promise<AgentResult> {
  const agent = new FeatureAgent({
    projectRoot: projectPath,
    ...options
  });

  return agent.implement(featureDescription);
}

/**
 * Schnell einen Bug fixen
 */
export async function fixBug(
  projectPath: string,
  bugDescription: string,
  options: Omit<FeatureAgentConfig, 'projectRoot'> = {}
): Promise<AgentResult> {
  const agent = new FeatureAgent({
    projectRoot: projectPath,
    ...options
  });

  return agent.fixBug(bugDescription);
}

/**
 * Schnell refactoren
 */
export async function refactorCode(
  projectPath: string,
  refactorDescription: string,
  options: Omit<FeatureAgentConfig, 'projectRoot'> = {}
): Promise<AgentResult> {
  const agent = new FeatureAgent({
    projectRoot: projectPath,
    ...options
  });

  return agent.refactor(refactorDescription);
}
