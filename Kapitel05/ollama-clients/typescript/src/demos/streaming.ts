/**
 * Demo: Streaming mit Ollama
 *
 * Zeigt die Streaming-API für Echtzeit-Ausgabe.
 */

import ollama from "ollama";

async function streamingChat() {
  console.log("=== Streaming Chat Demo ===\n");
  console.log("Frage: Erkläre den Unterschied zwischen let und const in JavaScript.\n");
  console.log("Antwort (gestreamt):");

  const response = await ollama.chat({
    model: "llama3.2",
    messages: [
      {
        role: "user",
        content: "Erkläre den Unterschied zwischen let und const in JavaScript. Maximal 3 Sätze.",
      },
    ],
    stream: true,
  });

  let tokenCount = 0;
  const startTime = Date.now();

  for await (const part of response) {
    process.stdout.write(part.message.content);
    tokenCount++;
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n\nStatistiken:`);
  console.log(`  - Chunks empfangen: ${tokenCount}`);
  console.log(`  - Dauer: ${duration.toFixed(2)}s`);
  console.log(`  - Geschwindigkeit: ~${(tokenCount / duration).toFixed(1)} chunks/s`);
}

async function streamingGenerate() {
  console.log("\n=== Streaming Generate Demo ===\n");
  console.log("Prompt: Die wichtigsten Programmiersprachen für 2025 sind:\n");

  const response = await ollama.generate({
    model: "llama3.2",
    prompt: "Die wichtigsten Programmiersprachen für 2025 sind:",
    stream: true,
    options: {
      num_predict: 100,
    },
  });

  for await (const part of response) {
    process.stdout.write(part.response);
  }

  console.log("\n");
}

async function streamWithAbort() {
  console.log("=== Streaming mit Abbruch Demo ===\n");
  console.log("Stoppe nach 5 Sekunden...\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await ollama.chat({
      model: "llama3.2",
      messages: [
        {
          role: "user",
          content: "Schreibe eine lange Geschichte über einen Programmierer.",
        },
      ],
      stream: true,
    });

    for await (const part of response) {
      if (controller.signal.aborted) {
        console.log("\n\n[Abgebrochen nach 5 Sekunden]");
        break;
      }
      process.stdout.write(part.message.content);
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.log("\n\n[Request abgebrochen]");
    } else {
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  await streamingChat();
  await streamingGenerate();
  await streamWithAbort();
}

main().catch(console.error);
