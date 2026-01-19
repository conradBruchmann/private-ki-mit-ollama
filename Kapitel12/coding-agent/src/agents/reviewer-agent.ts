/**
 * Reviewer Agent - Code-Review und Qualitätsprüfung
 * Kapitel 11: Architektur eines Programmierautomaten
 */

import { BaseAgent, AgentInput, AgentOutput, AgentContext } from "./base-agent.js";
import { Task, PlannedStep, ToolCall, Artifact } from "../types/task.js";
import { Message } from "../types/message.js";

export class ReviewerAgent extends BaseAgent {
  async execute(input: AgentInput): Promise<AgentOutput> {
    const { task, step, context } = input;

    console.log(`[Reviewer] Reviewing changes for: ${task.title}`);

    const messages: Message[] = [
      {
        role: "system",
        content: this.buildSystemPrompt(),
      },
      {
        role: "user",
        content: this.buildReviewPrompt(task, context),
      },
    ];

    const result = await this.runAgentLoop(messages, 3);

    // Review-Ergebnis parsen
    const reviewResult = this.parseReviewResult(result.finalResponse);

    return {
      success: result.success && reviewResult.approved,
      result: result.finalResponse,
      toolCalls: result.toolCalls,
      artifacts: [
        {
          type: "documentation",
          content: JSON.stringify(reviewResult, null, 2),
          metadata: { type: "code_review" },
        },
      ],
      nextAction: reviewResult.approved ? "done" : undefined,
    };
  }

  private buildSystemPrompt(): string {
    return `Du bist ein erfahrener Code-Reviewer und Senior Developer.

AUFGABEN:
1. Geänderten Code analysieren und bewerten
2. Best Practices und Code-Qualität prüfen
3. Potenzielle Bugs und Sicherheitsprobleme identifizieren
4. Konstruktives Feedback geben

TOOLS:
- read_file: Code lesen
- search_code: Patterns suchen
- run_command: Linting/Type-Checking ausführen

PRÜF-KRITERIEN:
1. **Korrektheit**: Erfüllt der Code die Anforderungen?
2. **Lesbarkeit**: Ist der Code verständlich?
3. **Wartbarkeit**: Ist der Code gut strukturiert?
4. **Performance**: Gibt es offensichtliche Performance-Probleme?
5. **Sicherheit**: Gibt es Sicherheitslücken?
6. **Tests**: Sind ausreichend Tests vorhanden?

OUTPUT-FORMAT:
Gib dein Review als JSON zurück:
\`\`\`json
{
  "approved": true/false,
  "summary": "Kurze Zusammenfassung",
  "issues": [
    {
      "severity": "critical|major|minor|suggestion",
      "file": "pfad/zur/datei.ts",
      "line": 42,
      "description": "Beschreibung des Problems",
      "suggestion": "Vorgeschlagene Lösung"
    }
  ],
  "positives": ["Was gut gemacht wurde"]
}
\`\`\``;
  }

  private buildReviewPrompt(task: Task, context: AgentContext): string {
    // Geänderte Dateien aus vorherigen Schritten
    const changedFiles = context.previousSteps
      .flatMap((s) => s.toolCalls)
      .filter((tc) => tc.tool === "write_file")
      .map((tc) => tc.input.path as string);

    return `
CODE-REVIEW ANFRAGE

AUFGABE:
${task.title}
${task.description}

GEÄNDERTE DATEIEN:
${changedFiles.length > 0 ? changedFiles.join("\n") : "Keine Dateien geändert"}

PROJEKT:
Sprache: ${task.context.language}
Framework: ${task.context.framework || "Keins"}

SCHRITTE:
1. Lies die geänderten Dateien
2. Prüfe den Code auf Qualität, Bugs, Sicherheit
3. Führe ggf. Linting aus (run_command)
4. Gib ein strukturiertes Review-Ergebnis zurück

Bewerte kritisch aber fair. Gib konkrete, umsetzbare Verbesserungsvorschläge.`;
  }

  private parseReviewResult(response: string): ReviewResult {
    // JSON aus der Antwort extrahieren
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Fallthrough
      }
    }

    // Fallback: Versuche direktes Parsen
    try {
      const jsonStart = response.indexOf("{");
      const jsonEnd = response.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(response.slice(jsonStart, jsonEnd + 1));
      }
    } catch {
      // Fallthrough
    }

    // Heuristik: Wenn "approved" oder "genehmigt" vorkommt, akzeptieren
    const approved =
      response.toLowerCase().includes("approved") ||
      response.toLowerCase().includes("genehmigt") ||
      response.toLowerCase().includes("looks good") ||
      response.toLowerCase().includes("sieht gut aus");

    return {
      approved,
      summary: response.slice(0, 500),
      issues: [],
      positives: [],
    };
  }
}

interface ReviewResult {
  approved: boolean;
  summary: string;
  issues: Array<{
    severity: "critical" | "major" | "minor" | "suggestion";
    file?: string;
    line?: number;
    description: string;
    suggestion?: string;
  }>;
  positives: string[];
}
