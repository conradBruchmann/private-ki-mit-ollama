#!/usr/bin/env node
/**
 * Coding Agent CLI
 * Kapitel 11: Architektur eines Programmierautomaten
 *
 * Verwendung:
 *   npx tsx src/cli.ts task --type feature --title "Add login" --project ./myapp
 *   npx tsx src/cli.ts task --type bugfix --title "Fix null error" --project ./myapp
 */

import { Command } from "commander";
import { createTask, TaskType, TaskContext } from "./types/task.js";
import { AgentOrchestrator } from "./orchestration/orchestrator.js";
import { OllamaClient } from "./llm/ollama-client.js";
import * as readline from "readline";

const program = new Command();

program
  .name("coding-agent")
  .description("Programmierautomat - Agent-basiertes Coding System")
  .version("1.0.0");

// Task Command
program
  .command("task")
  .description("Erstellt und führt einen Coding-Task aus")
  .requiredOption("-t, --type <type>", "Task-Typ (feature, bugfix, refactor, test, docs)")
  .requiredOption("--title <title>", "Task-Titel")
  .option("-d, --description <desc>", "Task-Beschreibung")
  .option("-p, --project <path>", "Projekt-Pfad", process.cwd())
  .option("-l, --language <lang>", "Programmiersprache", "typescript")
  .option("-f, --framework <framework>", "Framework (optional)")
  .option("--files <files>", "Relevante Dateien (komma-getrennt)")
  .option("--planner-model <model>", "Modell für Planner", "llama3.2")
  .option("--coder-model <model>", "Modell für Coder", "qwen2.5-coder:7b")
  .option("--ollama-url <url>", "Ollama Base URL", "http://localhost:11434")
  .action(async (options) => {
    console.log("\n🤖 Coding Agent - Programmierautomat\n");

    // Task-Kontext erstellen
    const context: TaskContext = {
      projectPath: options.project,
      language: options.language,
      framework: options.framework,
      relevantFiles: options.files ? options.files.split(",") : [],
      userInstructions: options.description,
      constraints: {
        allowNewFiles: true,
        allowDeleteFiles: false,
      },
    };

    // Task erstellen
    const task = createTask(
      options.type as TaskType,
      options.title,
      options.description || options.title,
      context
    );

    console.log(`📋 Task: ${task.title}`);
    console.log(`   Type: ${task.type}`);
    console.log(`   Project: ${task.context.projectPath}`);
    console.log(`   Language: ${task.context.language}`);
    console.log();

    // Orchestrator erstellen und Task ausführen
    const orchestrator = new AgentOrchestrator({
      projectRoot: options.project,
      ollamaBaseUrl: options.ollamaUrl,
      models: {
        planner: options.plannerModel,
        coder: options.coderModel,
        tester: options.plannerModel,
        reviewer: options.plannerModel,
      },
    });

    const result = await orchestrator.executeTask(task);

    // Ergebnis anzeigen
    console.log("\n📊 Ergebnis:\n");
    console.log(`   Status: ${result.status}`);
    console.log(`   Success: ${result.result?.success}`);
    console.log(`   Summary: ${result.result?.summary}`);

    if (result.result?.filesChanged.length) {
      console.log(`\n   Geänderte Dateien:`);
      for (const file of result.result.filesChanged) {
        console.log(`     - ${file}`);
      }
    }

    if (result.result?.testsRun) {
      console.log(
        `\n   Tests: ${result.result.testsPassed}/${result.result.testsRun} bestanden`
      );
    }
  });

// Interactive Command
program
  .command("interactive")
  .alias("i")
  .description("Interaktiver Modus")
  .option("-p, --project <path>", "Projekt-Pfad", process.cwd())
  .option("--ollama-url <url>", "Ollama Base URL", "http://localhost:11434")
  .action(async (options) => {
    console.log("\n🤖 Coding Agent - Interaktiver Modus\n");
    console.log(`   Projekt: ${options.project}`);
    console.log(`   Ollama: ${options.ollamaUrl}`);
    console.log("\n   Befehle: task, models, status, exit\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const orchestrator = new AgentOrchestrator({
      projectRoot: options.project,
      ollamaBaseUrl: options.ollamaUrl,
    });

    const ollama = new OllamaClient({ baseUrl: options.ollamaUrl });

    const prompt = () => {
      rl.question("agent> ", async (input) => {
        const trimmed = input.trim().toLowerCase();

        if (trimmed === "exit" || trimmed === "quit") {
          console.log("\n👋 Auf Wiedersehen!\n");
          rl.close();
          return;
        }

        if (trimmed === "models") {
          try {
            const models = await ollama.listModels();
            console.log("\nVerfügbare Modelle:");
            for (const model of models) {
              console.log(`  - ${model}`);
            }
            console.log();
          } catch (error) {
            console.log("\nFehler beim Abrufen der Modelle:", error);
          }
          prompt();
          return;
        }

        if (trimmed === "help") {
          console.log(`
Befehle:
  task     - Neuen Task erstellen (interaktiv)
  models   - Verfügbare Modelle anzeigen
  status   - Ollama-Status prüfen
  exit     - Beenden
`);
          prompt();
          return;
        }

        if (trimmed === "status") {
          try {
            const models = await ollama.listModels();
            console.log(`\n✅ Ollama verbunden (${models.length} Modelle)\n`);
          } catch {
            console.log("\n❌ Ollama nicht erreichbar\n");
          }
          prompt();
          return;
        }

        if (trimmed === "task") {
          console.log("\nNeuer Task (Strg+C zum Abbrechen)\n");

          const askQuestion = (question: string): Promise<string> => {
            return new Promise((resolve) => {
              rl.question(question, (answer) => resolve(answer.trim()));
            });
          };

          try {
            const type = await askQuestion(
              "Typ (feature/bugfix/refactor/test/docs): "
            );
            const title = await askQuestion("Titel: ");
            const description = await askQuestion("Beschreibung: ");
            const language = await askQuestion("Sprache [typescript]: ");

            const context: TaskContext = {
              projectPath: options.project,
              language: language || "typescript",
              relevantFiles: [],
              userInstructions: description,
            };

            const task = createTask(
              (type || "feature") as TaskType,
              title || "Unnamed Task",
              description || title,
              context
            );

            console.log("\n🚀 Starte Task...\n");
            const result = await orchestrator.executeTask(task);

            console.log(`\nStatus: ${result.status}`);
            console.log(`Erfolg: ${result.result?.success}\n`);
          } catch (error) {
            console.log("\nTask abgebrochen\n");
          }

          prompt();
          return;
        }

        console.log('Unbekannter Befehl. "help" für Hilfe.');
        prompt();
      });
    };

    prompt();
  });

// Models Command
program
  .command("models")
  .description("Listet verfügbare Ollama-Modelle")
  .option("--ollama-url <url>", "Ollama Base URL", "http://localhost:11434")
  .action(async (options) => {
    const ollama = new OllamaClient({ baseUrl: options.ollamaUrl });

    try {
      const models = await ollama.listModels();
      console.log("\nVerfügbare Modelle:\n");
      for (const model of models) {
        console.log(`  - ${model}`);
      }
      console.log();
    } catch (error) {
      console.error("Fehler:", error);
    }
  });

program.parse();
