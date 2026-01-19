/**
 * Planner Agent - Erstellt Ausführungspläne
 * Kapitel 11: Architektur eines Programmierautomaten
 */

import { BaseAgent, AgentInput, AgentOutput, AgentContext } from "./base-agent.js";
import { Task, TaskPlan } from "../types/task.js";
import { Message } from "../types/message.js";

export class PlannerAgent extends BaseAgent {
  async execute(input: AgentInput): Promise<AgentOutput> {
    const { task, context } = input;

    console.log(`[Planner] Creating plan for: ${task.title}`);

    const messages: Message[] = [
      {
        role: "system",
        content: this.buildSystemPrompt(),
      },
      {
        role: "user",
        content: this.buildPlanningPrompt(task, context),
      },
    ];

    const result = await this.runAgentLoop(messages, 5);

    if (!result.success) {
      return {
        success: false,
        result: result.finalResponse,
        toolCalls: result.toolCalls,
        artifacts: [],
      };
    }

    // Plan aus Antwort extrahieren
    const plan = this.extractPlan(result.finalResponse);

    return {
      success: true,
      result: JSON.stringify(plan),
      toolCalls: result.toolCalls,
      artifacts: [
        {
          type: "documentation",
          content: JSON.stringify(plan, null, 2),
          metadata: { planVersion: 1 },
        },
      ],
      nextAction: "continue",
    };
  }

  private buildSystemPrompt(): string {
    return `Du bist ein erfahrener Software-Architekt und Planungsexperte.

Deine Aufgabe ist es, Entwicklungsaufgaben in konkrete, ausführbare Schritte zu zerlegen.

REGELN:
1. Analysiere zuerst die bestehende Codebase mit den verfügbaren Tools
2. Identifiziere alle relevanten Dateien
3. Erstelle einen detaillierten Plan mit klaren Schritten
4. Schätze die Komplexität ein
5. Identifiziere potenzielle Risiken

VERFÜGBARE TOOLS:
- read_file: Datei lesen
- list_files: Dateien auflisten
- search_code: Code durchsuchen

OUTPUT-FORMAT:
Gib den Plan als JSON zurück mit folgender Struktur:
\`\`\`json
{
  "summary": "Kurze Zusammenfassung",
  "approach": "Gewählter Lösungsansatz",
  "steps": [
    {
      "order": 1,
      "description": "Was zu tun ist",
      "type": "analyze|code|test|validate",
      "files": ["betroffene/dateien.ts"]
    }
  ],
  "estimatedComplexity": "low|medium|high",
  "risks": ["Mögliche Probleme"]
}
\`\`\``;
  }

  private buildPlanningPrompt(task: Task, context: AgentContext): string {
    return `
AUFGABE:
Typ: ${task.type}
Titel: ${task.title}
Beschreibung: ${task.description}

PROJEKT:
Sprache: ${task.context.language}
Framework: ${task.context.framework || "Keins"}
Pfad: ${task.context.projectPath}

BEKANNTE DATEIEN:
${task.context.relevantFiles.join("\n") || "Keine spezifischen Dateien angegeben"}

ZUSÄTZLICHE ANWEISUNGEN:
${task.context.userInstructions || "Keine"}

CONSTRAINTS:
- Max. Dateiänderungen: ${task.context.constraints?.maxFileChanges || "Unbegrenzt"}
- Neue Dateien erlaubt: ${task.context.constraints?.allowNewFiles ?? true}
- Löschen erlaubt: ${task.context.constraints?.allowDeleteFiles ?? false}

Bitte analysiere die Codebase mit den verfügbaren Tools und erstelle einen detaillierten Ausführungsplan.`;
  }

  private extractPlan(response: string): TaskPlan {
    // JSON aus der Antwort extrahieren
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Fallthrough to next attempt
      }
    }

    // Fallback: Versuche direktes Parsen
    try {
      // Finde JSON-Objekt in der Antwort
      const jsonStart = response.indexOf("{");
      const jsonEnd = response.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(response.slice(jsonStart, jsonEnd + 1));
      }
    } catch {
      // Fallthrough
    }

    // Minimaler Plan als Fallback
    return {
      summary: "Plan konnte nicht extrahiert werden",
      approach: response.slice(0, 500),
      steps: [
        {
          order: 1,
          description: "Aufgabe manuell analysieren",
          type: "analyze",
          files: [],
        },
      ],
      estimatedComplexity: "medium",
      risks: ["Plan-Extraktion fehlgeschlagen"],
    };
  }
}
