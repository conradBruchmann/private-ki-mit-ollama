/**
 * Demo: OpenAI SDK Kompatibilität
 *
 * Zeigt, wie das OpenAI SDK mit Ollama verwendet werden kann.
 * Bestehender OpenAI-Code funktioniert mit minimalen Änderungen.
 */

import OpenAI from "openai";

// OpenAI Client auf Ollama zeigen
const client = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama", // Wird von Ollama ignoriert
});

async function basicOpenAIChat() {
  console.log("=== OpenAI SDK mit Ollama ===\n");

  const completion = await client.chat.completions.create({
    model: "llama3.2",
    messages: [
      { role: "system", content: "Du bist ein hilfreicher Assistent." },
      { role: "user", content: "Was ist REST API? Ein Satz." },
    ],
  });

  console.log("Antwort:", completion.choices[0].message.content);
  console.log("\nUsage:");
  console.log(`  - Prompt Tokens: ${completion.usage?.prompt_tokens}`);
  console.log(`  - Completion Tokens: ${completion.usage?.completion_tokens}`);
}

async function streamingOpenAI() {
  console.log("\n=== OpenAI Streaming mit Ollama ===\n");

  console.log("Frage: Was sind die SOLID-Prinzipien?\n");
  console.log("Antwort:");

  const stream = await client.chat.completions.create({
    model: "llama3.2",
    messages: [
      {
        role: "user",
        content: "Nenne die 5 SOLID-Prinzipien. Nur die Namen, eine Zeile pro Prinzip.",
      },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    process.stdout.write(content);
  }

  console.log("\n");
}

async function functionCallingDemo() {
  console.log("\n=== Function Calling (experimentell) ===\n");

  // Hinweis: Function Calling wird von einigen Modellen unterstützt
  try {
    const response = await client.chat.completions.create({
      model: "llama3.2",
      messages: [
        {
          role: "user",
          content: "Wie ist das Wetter in Berlin?",
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "get_weather",
            description: "Ruft das aktuelle Wetter für einen Ort ab",
            parameters: {
              type: "object",
              properties: {
                location: {
                  type: "string",
                  description: "Die Stadt, z.B. Berlin",
                },
              },
              required: ["location"],
            },
          },
        },
      ],
    });

    const message = response.choices[0].message;

    if (message.tool_calls) {
      console.log("Tool Call erkannt:");
      for (const call of message.tool_calls) {
        console.log(`  - Funktion: ${call.function.name}`);
        console.log(`  - Argumente: ${call.function.arguments}`);
      }
    } else {
      console.log("Keine Tool Calls, normale Antwort:");
      console.log(message.content);
    }
  } catch (error) {
    console.log("Function Calling nicht unterstützt von diesem Modell.");
    console.log("Verwenden Sie ein Modell wie llama3.1 oder qwen2.5 für Tool-Support.");
  }
}

async function embeddings() {
  console.log("\n=== Embeddings mit OpenAI SDK ===\n");

  const response = await client.embeddings.create({
    model: "nomic-embed-text",
    input: "Ollama macht lokale KI einfach.",
  });

  const embedding = response.data[0].embedding;
  console.log(`Embedding-Dimension: ${embedding.length}`);
  console.log(`Erste 5 Werte: [${embedding.slice(0, 5).map((n) => n.toFixed(4)).join(", ")}...]`);
}

async function migrateFromOpenAI() {
  console.log("\n=== Migration von OpenAI zu Ollama ===\n");

  console.log("Vorher (OpenAI):");
  console.log(`  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });`);
  console.log(`  const completion = await client.chat.completions.create({`);
  console.log(`    model: "gpt-4",`);
  console.log(`    messages: [...]`);
  console.log(`  });`);

  console.log("\nNachher (Ollama):");
  console.log(`  const client = new OpenAI({`);
  console.log(`    baseURL: "http://localhost:11434/v1",`);
  console.log(`    apiKey: "ollama"`);
  console.log(`  });`);
  console.log(`  const completion = await client.chat.completions.create({`);
  console.log(`    model: "llama3.2",  // <- Nur Modellname ändern`);
  console.log(`    messages: [...]`);
  console.log(`  });`);

  console.log("\n2 Zeilen Änderung - der Rest bleibt gleich!");
}

async function main() {
  await basicOpenAIChat();
  await streamingOpenAI();
  await functionCallingDemo();
  await embeddings();
  await migrateFromOpenAI();
}

main().catch(console.error);
