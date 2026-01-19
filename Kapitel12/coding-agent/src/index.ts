/**
 * Coding Agent - Hauptmodul
 * Kapitel 11: Architektur eines Programmierautomaten
 *
 * Beispiel-Code für das Buch "Private KI mit Ollama"
 */

// Types
export * from "./types/index.js";

// Tools
export {
  Tool,
  ToolResult,
  ToolExecutor,
  ReadFileTool,
  WriteFileTool,
  ListFilesTool,
  SearchCodeTool,
  RunCommandTool,
  GitTool,
  createStandardTools,
} from "./tools/index.js";

// LLM
export { OllamaClient, OllamaConfig } from "./llm/index.js";

// Agents
export {
  BaseAgent,
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentContext,
  PlannerAgent,
  CoderAgent,
  TesterAgent,
  ReviewerAgent,
} from "./agents/index.js";

// Models
export {
  ModelRouter,
  ModelConfig,
  AVAILABLE_MODELS,
} from "./models/index.js";

// Orchestration
export {
  AgentOrchestrator,
  OrchestratorConfig,
} from "./orchestration/index.js";

/**
 * Demo: Einfacher Task ausführen
 */
async function main() {
  const { createTask } = await import("./types/task.js");
  const { AgentOrchestrator } = await import("./orchestration/orchestrator.js");
  const { OllamaClient } = await import("./llm/ollama-client.js");

  console.log("\n🤖 Coding Agent - Demo\n");

  // Prüfe Ollama-Verbindung
  const ollama = new OllamaClient();
  try {
    const models = await ollama.listModels();
    console.log(`✅ Ollama verbunden (${models.length} Modelle verfügbar)`);

    // Zeige einige Modelle
    console.log("\nVerfügbare Modelle:");
    for (const model of models.slice(0, 5)) {
      console.log(`  - ${model}`);
    }
    if (models.length > 5) {
      console.log(`  ... und ${models.length - 5} weitere`);
    }
  } catch (error) {
    console.log("❌ Ollama nicht erreichbar");
    console.log("   Bitte starten Sie Ollama mit: ollama serve");
    return;
  }

  console.log("\n📖 Beispiel-Task:\n");
  console.log(`   Type: feature`);
  console.log(`   Title: "Add greeting function"`);
  console.log(`   Description: "Create a function that returns a greeting"`);

  console.log(`
💡 Verwendung:

   CLI:
     npx tsx src/cli.ts task \\
       --type feature \\
       --title "Add login" \\
       --project ./my-app \\
       --language typescript

   Server:
     npx tsx src/server.ts

   Programmatisch:
     import { AgentOrchestrator, createTask } from './src/index.js';

     const task = createTask('feature', 'My Task', 'Description', {
       projectPath: './my-project',
       language: 'typescript'
     });

     const orchestrator = new AgentOrchestrator({
       projectRoot: './my-project'
     });

     const result = await orchestrator.executeTask(task);
`);
}

// Nur ausführen wenn direkt aufgerufen
const isMainModule =
  process.argv[1]?.endsWith("index.ts") ||
  process.argv[1]?.endsWith("index.js");

if (isMainModule) {
  main().catch(console.error);
}
