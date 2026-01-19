/**
 * Tester Agent - Schreibt und führt Tests aus
 * Kapitel 11: Architektur eines Programmierautomaten
 */

import { BaseAgent, AgentInput, AgentOutput, AgentContext } from "./base-agent.js";
import { Task, PlannedStep, ToolCall, Artifact } from "../types/task.js";
import { Message } from "../types/message.js";

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  output?: string;
}

export class TesterAgent extends BaseAgent {
  async execute(input: AgentInput): Promise<AgentOutput> {
    const { task, step, context } = input;

    console.log(`[Tester] Running tests for: ${task.title}`);

    const messages: Message[] = [
      {
        role: "system",
        content: this.buildSystemPrompt(),
      },
      {
        role: "user",
        content: this.buildTestingPrompt(task, step, context),
      },
    ];

    const result = await this.runAgentLoop(messages);

    // Test-Ergebnisse aus Tool-Calls extrahieren
    const testResults = this.extractTestResults(result.toolCalls);
    const artifacts = this.buildTestArtifacts(result.toolCalls, testResults);

    return {
      success: result.success && testResults.allPassed,
      result: this.formatTestSummary(testResults),
      toolCalls: result.toolCalls,
      artifacts,
      nextAction: testResults.allPassed ? "continue" : undefined,
    };
  }

  private buildSystemPrompt(): string {
    return `Du bist ein Test-Experte und Quality Engineer.

AUFGABEN:
1. Tests für neuen/geänderten Code schreiben
2. Bestehende Tests ausführen
3. Test-Ergebnisse analysieren
4. Bei Fehlern die Ursache identifizieren

TOOLS:
- read_file: Dateien lesen
- write_file: Tests schreiben
- run_command: Tests ausführen (npm test, jest, vitest, pytest, cargo test)
- search_code: Testbare Funktionen finden
- list_files: Test-Dateien finden

TEST-STRATEGIE:
1. Analysiere den zu testenden Code
2. Identifiziere Testfälle (Happy Path, Edge Cases, Fehler)
3. Schreibe Tests im Stil des Projekts
4. Führe Tests aus
5. Bei Fehlern: Analysiere und berichte

WICHTIG:
- Nutze das Test-Framework des Projekts
- Teste Randfälle und Fehlerbehandlung
- Mockke externe Abhängigkeiten wenn nötig
- Gib eine klare Zusammenfassung der Testergebnisse`;
  }

  private buildTestingPrompt(
    task: Task,
    step: PlannedStep,
    context: AgentContext
  ): string {
    // Geänderte Dateien aus vorherigen Schritten
    const changedFiles = context.previousSteps
      .flatMap((s) => s.toolCalls)
      .filter((tc) => tc.tool === "write_file")
      .map((tc) => tc.input.path as string);

    return `
AUFGABE: Tests schreiben und ausführen

GEÄNDERTE DATEIEN:
${changedFiles.length > 0 ? changedFiles.join("\n") : "Keine Dateien bisher geändert"}

BESCHREIBUNG DER ÄNDERUNGEN:
${task.description}

PROJEKT-SPRACHE: ${task.context.language}
FRAMEWORK: ${task.context.framework || "Standard"}

SCHRITTE:
1. Lies die geänderten Dateien (falls vorhanden)
2. Identifiziere testbare Funktionen/Komponenten
3. Prüfe ob Tests existieren, erweitere oder erstelle neue
4. Führe die Tests aus
5. Berichte das Ergebnis

Gib am Ende eine klare Zusammenfassung:
- Anzahl Tests
- Bestanden/Fehlgeschlagen
- Bei Fehlern: Was ist schiefgelaufen`;
  }

  private extractTestResults(toolCalls: ToolCall[]): TestResults {
    const testRuns = toolCalls.filter(
      (tc) =>
        tc.tool === "run_command" &&
        typeof tc.input.command === "string" &&
        (tc.input.command.includes("test") ||
          tc.input.command.includes("jest") ||
          tc.input.command.includes("vitest") ||
          tc.input.command.includes("pytest") ||
          tc.input.command.includes("cargo test"))
    );

    if (testRuns.length === 0) {
      return { total: 0, passed: 0, failed: 0, allPassed: true };
    }

    // Ergebnisse aus letztem Test-Run parsen
    const lastRun = testRuns[testRuns.length - 1];
    const output = typeof lastRun.output === "object" && lastRun.output !== null
      ? (lastRun.output as { stdout?: string }).stdout || ""
      : "";

    // Typische Test-Output Patterns
    const passedMatch = output.match(/(\d+)\s*(?:passed|passing)/i);
    const failedMatch = output.match(/(\d+)\s*(?:failed|failing)/i);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;

    // Prüfe auch auf Fehler-Status
    const hasError = lastRun.error !== undefined;

    return {
      total: passed + failed,
      passed,
      failed,
      allPassed: failed === 0 && !hasError,
      output,
    };
  }

  private buildTestArtifacts(
    toolCalls: ToolCall[],
    results: TestResults
  ): Artifact[] {
    const artifacts: Artifact[] = [];

    // Geschriebene Test-Dateien
    const testFiles = toolCalls
      .filter(
        (tc) =>
          tc.tool === "write_file" &&
          typeof tc.input.path === "string" &&
          (tc.input.path.includes("test") || tc.input.path.includes("spec"))
      )
      .map((tc) => ({
        type: "file" as const,
        path: tc.input.path as string,
        content: tc.input.content as string,
        metadata: { isTest: true },
      }));

    artifacts.push(...testFiles);

    // Test-Ergebnis
    artifacts.push({
      type: "test_result",
      content: JSON.stringify(results),
      metadata: results,
    });

    return artifacts;
  }

  private formatTestSummary(results: TestResults): string {
    if (results.total === 0) {
      return "Keine Tests ausgeführt";
    }

    let summary = `Tests: ${results.passed}/${results.total} bestanden`;
    if (results.failed > 0) {
      summary += ` (${results.failed} fehlgeschlagen)`;
    }
    return summary;
  }
}
