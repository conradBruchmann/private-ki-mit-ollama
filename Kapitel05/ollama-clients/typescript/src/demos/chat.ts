/**
 * Demo: Einfacher Chat mit Ollama SDK
 *
 * Zeigt die grundlegende Verwendung des Ollama SDK für Chat-Anfragen.
 */

import ollama from "ollama";

async function simpleChat() {
  console.log("=== Einfacher Chat Demo ===\n");

  const response = await ollama.chat({
    model: "llama3.2",
    messages: [
      {
        role: "user",
        content: "Was ist Docker? Erkläre es in einem Satz.",
      },
    ],
  });

  console.log("Antwort:", response.message.content);
  console.log("\nStatistiken:");
  console.log(`  - Modell: ${response.model}`);
  console.log(`  - Generierte Tokens: ${response.eval_count}`);
  console.log(
    `  - Dauer: ${((response.total_duration ?? 0) / 1e9).toFixed(2)}s`
  );
}

async function chatWithHistory() {
  console.log("\n=== Chat mit History Demo ===\n");

  const messages: { role: "user" | "assistant" | "system"; content: string }[] =
    [
      {
        role: "system",
        content: "Du bist ein Experte für Container-Technologien.",
      },
      { role: "user", content: "Was ist Kubernetes?" },
    ];

  // Erste Nachricht
  console.log("User: Was ist Kubernetes?");
  let response = await ollama.chat({
    model: "llama3.2",
    messages,
  });
  console.log("Assistant:", response.message.content);

  // History erweitern
  messages.push(response.message);
  messages.push({ role: "user", content: "Wie unterscheidet es sich von Docker Swarm?" });

  // Zweite Nachricht mit Kontext
  console.log("\nUser: Wie unterscheidet es sich von Docker Swarm?");
  response = await ollama.chat({
    model: "llama3.2",
    messages,
  });
  console.log("Assistant:", response.message.content);
}

async function chatWithOptions() {
  console.log("\n=== Chat mit Options Demo ===\n");

  // Kreativ (hohe Temperatur)
  console.log("Kreative Antwort (temperature=1.5):");
  const creative = await ollama.chat({
    model: "llama3.2",
    messages: [{ role: "user", content: "Erfinde einen Namen für ein KI-Startup." }],
    options: {
      temperature: 1.5,
      num_predict: 50,
    },
  });
  console.log(creative.message.content);

  // Deterministisch (niedrige Temperatur, Seed)
  console.log("\nDeterministische Antwort (temperature=0.1, seed=42):");
  const deterministic = await ollama.chat({
    model: "llama3.2",
    messages: [{ role: "user", content: "Was ist 2+2?" }],
    options: {
      temperature: 0.1,
      seed: 42,
    },
  });
  console.log(deterministic.message.content);
}

async function main() {
  await simpleChat();
  await chatWithHistory();
  await chatWithOptions();
}

main().catch(console.error);
