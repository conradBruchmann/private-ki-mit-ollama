/**
 * Coder Agent - Schreibt und modifiziert Code
 * Kapitel 11: Architektur eines Programmierautomaten
 */

import { BaseAgent, AgentInput, AgentOutput, AgentContext } from "./base-agent.js";
import { Task, PlannedStep } from "../types/task.js";
import { Message } from "../types/message.js";

export class CoderAgent extends BaseAgent {
  async execute(input: AgentInput): Promise<AgentOutput> {
    const { task, step, context } = input;

    console.log(`[Coder] Executing step ${step.order}: ${step.description}`);

    const messages: Message[] = [
      {
        role: "system",
        content: this.buildSystemPrompt(task.context.language),
      },
      ...this.buildContextMessages(context),
      {
        role: "user",
        content: this.buildCodingPrompt(task, step),
      },
    ];

    const result = await this.runAgentLoop(messages);

    // Dateiänderungen aus Tool-Calls extrahieren
    const artifacts = this.extractFileArtifacts(result.toolCalls);

    return {
      success: result.success,
      result: result.finalResponse,
      toolCalls: result.toolCalls,
      artifacts,
      nextAction: result.success ? "continue" : undefined,
    };
  }

  private buildSystemPrompt(language: string): string {
    return `Du bist ein erfahrener ${language}-Entwickler.

REGELN:
1. Schreibe sauberen, wartbaren Code
2. Folge den bestehenden Code-Konventionen des Projekts
3. Füge sinnvolle Kommentare nur bei komplexer Logik hinzu
4. Behandle Fehler angemessen
5. Nutze die verfügbaren Tools um Dateien zu lesen und zu schreiben

TOOLS:
- read_file: Datei lesen
- write_file: Datei schreiben
- search_code: Code durchsuchen
- run_command: Befehle ausführen (lint, type-check)
- list_files: Dateien auflisten

WICHTIG:
- Lies IMMER zuerst die relevanten Dateien
- Verstehe den bestehenden Code bevor du änderst
- Mache inkrementelle, testbare Änderungen
- Nutze bestehende Patterns und Utilities
- Schreibe vollständigen Code, keine Platzhalter

Wenn du fertig bist, fasse kurz zusammen was du geändert hast.`;
  }

  private buildCodingPrompt(task: Task, step: PlannedStep): string {
    return `
AKTUELLE AUFGABE:
${task.title}

BESCHREIBUNG:
${task.description}

AKTUELLER SCHRITT (${step.order}):
${step.description}

ZU BEARBEITENDE DATEIEN:
${step.files.length > 0 ? step.files.join("\n") : "Keine spezifischen Dateien (du entscheidest)"}

SCHRITTE:
1. Lies zuerst die relevanten Dateien um den Kontext zu verstehen
2. Implementiere die erforderlichen Änderungen
3. Nutze write_file um die Änderungen zu speichern
4. Fasse zusammen was du geändert hast`;
  }

  private buildContextMessages(context: AgentContext): Message[] {
    // Vorherige Schritte als Kontext
    return context.previousSteps
      .filter((s) => s.status === "completed")
      .slice(-3) // Letzte 3 Schritte
      .map((step) => ({
        role: "assistant" as const,
        content: `Schritt ${step.order} abgeschlossen: ${step.description}\n${step.output || ""}`,
      }));
  }
}
