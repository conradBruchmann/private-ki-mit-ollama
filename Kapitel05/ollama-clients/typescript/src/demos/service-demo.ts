/**
 * Demo: OllamaService Klasse
 *
 * Zeigt die Verwendung der OllamaService-Wrapper-Klasse.
 */

import { OllamaService, safeChatWithRetry } from "../ollama-service.js";

async function basicServiceUsage() {
  console.log("=== OllamaService Basic Usage ===\n");

  const service = new OllamaService("llama3.2");

  // System-Prompt setzen
  service.setSystemPrompt(
    "Du bist ein freundlicher Coding-Assistent. Antworte immer auf Deutsch."
  );

  // Erste Frage
  console.log("User: Was ist eine Closure in JavaScript?");
  const answer1 = await service.chat("Was ist eine Closure in JavaScript? Kurz bitte.");
  console.log("Assistant:", answer1);

  // Folgefrage (nutzt History)
  console.log("\nUser: Zeig mir ein Beispiel.");
  const answer2 = await service.chat("Zeig mir ein Beispiel.");
  console.log("Assistant:", answer2);

  // History anzeigen
  console.log("\n--- Chat History ---");
  for (const msg of service.getHistory()) {
    console.log(`[${msg.role}]: ${msg.content.substring(0, 50)}...`);
  }
}

async function streamingServiceUsage() {
  console.log("\n=== OllamaService Streaming ===\n");

  const service = new OllamaService("llama3.2");
  service.setSystemPrompt("Du bist ein Experte für TypeScript.");

  console.log("Frage: Was sind Generics in TypeScript?\n");
  console.log("Antwort:");

  for await (const token of service.streamChat(
    "Was sind Generics in TypeScript? Erkläre kurz."
  )) {
    process.stdout.write(token);
  }

  console.log("\n");
}

async function multiModelUsage() {
  console.log("\n=== Multi-Model Usage ===\n");

  const service = new OllamaService();

  // Modelle auflisten
  const models = await OllamaService.listModels();
  console.log("Verfügbare Modelle:", models.slice(0, 5).join(", "));

  if (models.length > 0) {
    // Mit erstem verfügbaren Modell
    service.setModel(models[0]);
    console.log(`\nVerwende: ${models[0]}`);

    const response = await service.chat("Sage 'Hallo' auf drei Sprachen.");
    console.log("Antwort:", response);
  }
}

async function errorHandlingDemo() {
  console.log("\n=== Error Handling Demo ===\n");

  const service = new OllamaService("llama3.2");

  try {
    // Mit Retry-Logik
    const response = await safeChatWithRetry(
      service,
      "Was ist der Sinn des Lebens?",
      3
    );
    console.log("Antwort:", response);
  } catch (error) {
    console.error("Fehler:", (error as Error).message);
  }
}

async function completionDemo() {
  console.log("\n=== Text Completion Demo ===\n");

  const service = new OllamaService("llama3.2");

  const prompt = "Die drei wichtigsten Prinzipien beim Programmieren sind:";
  console.log("Prompt:", prompt);

  const completion = await service.complete(prompt, { numPredict: 100 });
  console.log("Completion:", completion);
}

async function main() {
  // Health-Check
  const healthy = await OllamaService.isHealthy();
  if (!healthy) {
    console.error("Ollama nicht erreichbar! Starten mit: ollama serve");
    process.exit(1);
  }

  await basicServiceUsage();
  await streamingServiceUsage();
  await multiModelUsage();
  await errorHandlingDemo();
  await completionDemo();
}

main().catch(console.error);
