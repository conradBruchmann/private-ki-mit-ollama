/**
 * Ollama TypeScript Client - Haupteinstiegspunkt
 *
 * Dieses Modul exportiert alle Komponenten für die Ollama-Integration.
 *
 * Verwendung:
 *   npm install
 *   npm run dev
 *
 * Demos ausführen:
 *   npm run demo:chat      - Einfacher Chat
 *   npm run demo:stream    - Streaming-Beispiel
 *   npm run demo:service   - Service-Klasse Demo
 *   npm run demo:openai    - OpenAI-kompatible API
 *   npm run demo:embeddings - Embeddings generieren
 */

export { OllamaService, OllamaError, safeChatWithRetry } from "./ollama-service.js";
export type { ChatOptions } from "./ollama-service.js";

// Schnellstart-Beispiel
import { OllamaService } from "./ollama-service.js";

async function main() {
  console.log("=== Ollama TypeScript Client ===\n");

  // Health-Check
  const healthy = await OllamaService.isHealthy();
  if (!healthy) {
    console.error("Ollama ist nicht erreichbar!");
    console.error("Starten Sie Ollama mit: ollama serve");
    process.exit(1);
  }

  // Verfügbare Modelle anzeigen
  const models = await OllamaService.listModels();
  console.log("Verfügbare Modelle:");
  models.forEach((m) => console.log(`  - ${m}`));
  console.log();

  // Service initialisieren
  const model = models.length > 0 ? models[0] : "llama3.2";
  const service = new OllamaService(model);
  console.log(`Verwende Modell: ${model}\n`);

  // System-Prompt setzen
  service.setSystemPrompt(
    "Du bist ein hilfreicher Assistent. Antworte kurz und präzise auf Deutsch."
  );

  // Einfache Anfrage
  console.log("Frage: Was ist TypeScript?");
  console.log("Antwort:");

  for await (const token of service.streamChat("Was ist TypeScript? (Maximal 2 Sätze)")) {
    process.stdout.write(token);
  }

  console.log("\n\n=== Demo abgeschlossen ===");
  console.log("Führen Sie weitere Demos mit 'npm run demo:*' aus.");
}

main().catch(console.error);
