#!/usr/bin/env node
/**
 * RAG Pipeline CLI
 * Kapitel 9: RAG-Architekturen
 *
 * Verwendung:
 *   npx tsx src/cli.ts ingest ./docs
 *   npx tsx src/cli.ts query "Was ist RAG?"
 *   npx tsx src/cli.ts stats
 */

import { Command } from "commander";
import { IngestionPipeline } from "./pipeline/ingestion-pipeline.js";
import { QueryPipeline } from "./pipeline/query-pipeline.js";
import * as readline from "readline";

const program = new Command();

program
  .name("rag")
  .description("RAG Document Pipeline - Kapitel 9")
  .version("1.0.0");

// Ingest Command
program
  .command("ingest <path>")
  .description("Dokumente laden und indexieren")
  .option("-p, --pattern <pattern>", "Glob-Pattern für Dateien", "**/*")
  .option("--chunk-size <size>", "Chunk-Größe in Zeichen", "1000")
  .option("--chunk-overlap <overlap>", "Überlappung zwischen Chunks", "200")
  .option("--model <model>", "Embedding-Modell", "nomic-embed-text")
  .option("--db <path>", "Pfad zur Datenbank", "./vector.db")
  .action(async (inputPath, options) => {
    console.log("🚀 RAG Ingestion Pipeline\n");

    const pipeline = new IngestionPipeline({
      chunking: {
        chunkSize: parseInt(options.chunkSize),
        chunkOverlap: parseInt(options.chunkOverlap),
      },
      embedding: {
        model: options.model,
      },
      vectorStore: {
        dbPath: options.db,
      },
    });

    try {
      // Prüfen ob Datei oder Verzeichnis
      const fs = await import("fs/promises");
      const stat = await fs.stat(inputPath);

      if (stat.isDirectory()) {
        await pipeline.ingestDirectory(inputPath, options.pattern);
      } else {
        await pipeline.ingestFile(inputPath);
      }
    } finally {
      pipeline.close();
    }
  });

// Query Command
program
  .command("query [question]")
  .description("Frage an das RAG-System stellen")
  .option("-k, --top-k <k>", "Anzahl der Ergebnisse", "5")
  .option("-m, --model <model>", "LLM-Modell für Antwortgenerierung", "llama3.2")
  .option("--db <path>", "Pfad zur Datenbank", "./vector.db")
  .option("-i, --interactive", "Interaktiver Modus")
  .action(async (question, options) => {
    const pipeline = new QueryPipeline({
      vectorStore: {
        dbPath: options.db,
      },
    });

    try {
      if (options.interactive || !question) {
        // Interaktiver Modus
        await runInteractiveMode(pipeline, options);
      } else {
        // Einzelne Frage
        await runSingleQuery(pipeline, question, options);
      }
    } finally {
      pipeline.close();
    }
  });

// Search Command (nur Suche, keine Generierung)
program
  .command("search <query>")
  .description("Ähnliche Dokumente suchen (ohne Antwortgenerierung)")
  .option("-k, --top-k <k>", "Anzahl der Ergebnisse", "5")
  .option("--db <path>", "Pfad zur Datenbank", "./vector.db")
  .action(async (query, options) => {
    const pipeline = new QueryPipeline({
      vectorStore: {
        dbPath: options.db,
      },
    });

    try {
      console.log(`🔍 Suche: "${query}"\n`);

      const results = await pipeline.search(query, {
        topK: parseInt(options.topK),
      });

      if (results.length === 0) {
        console.log("Keine Ergebnisse gefunden.");
        return;
      }

      console.log(`${results.length} Ergebnis(se):\n`);

      for (const result of results) {
        console.log(`📄 ${result.chunk.metadata.filename}`);
        console.log(`   Score: ${(result.score * 100).toFixed(1)}%`);
        console.log(`   ${result.chunk.content.slice(0, 200)}...`);
        console.log();
      }
    } finally {
      pipeline.close();
    }
  });

// Stats Command
program
  .command("stats")
  .description("Statistiken anzeigen")
  .option("--db <path>", "Pfad zur Datenbank", "./vector.db")
  .action(async (options) => {
    const { SQLiteVectorStore } = await import("./storage/index.js");
    const store = new SQLiteVectorStore({ dbPath: options.db });

    try {
      const stats = store.getStats();
      console.log("\n📊 Vector Store Statistiken:");
      console.log(`   Chunks: ${stats.count}`);
      console.log(`   Quellen: ${stats.sources.length}`);

      if (stats.sources.length > 0) {
        console.log("\n   Quelldateien:");
        for (const source of stats.sources) {
          console.log(`   - ${source}`);
        }
      }
    } finally {
      store.close();
    }
  });

// Clear Command
program
  .command("clear")
  .description("Vector Store leeren")
  .option("--db <path>", "Pfad zur Datenbank", "./vector.db")
  .action(async (options) => {
    const { SQLiteVectorStore } = await import("./storage/index.js");
    const store = new SQLiteVectorStore({ dbPath: options.db });

    try {
      store.clear();
      console.log("✅ Vector Store geleert");
    } finally {
      store.close();
    }
  });

// Hilfsfunktionen
async function runSingleQuery(
  pipeline: QueryPipeline,
  question: string,
  options: { topK: string; model: string }
) {
  console.log(`❓ Frage: ${question}\n`);
  console.log("⏳ Suche relevante Dokumente...\n");

  const result = await pipeline.query(
    question,
    { topK: parseInt(options.topK) },
    { model: options.model }
  );

  // Quellen anzeigen
  if (result.context.results.length > 0) {
    console.log("📚 Verwendete Quellen:");
    for (const r of result.context.results) {
      const score = (r.score * 100).toFixed(1);
      console.log(`   - ${r.chunk.metadata.filename} (${score}%)`);
    }
    console.log();
  }

  // Antwort anzeigen
  console.log("💬 Antwort:");
  console.log(result.answer);
}

async function runInteractiveMode(
  pipeline: QueryPipeline,
  options: { topK: string; model: string }
) {
  console.log("🤖 RAG Interactive Mode");
  console.log("   Tippen Sie Ihre Fragen ein. 'exit' zum Beenden.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    rl.question("❓ Sie: ", async (input) => {
      const trimmed = input.trim();

      if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        console.log("\n👋 Auf Wiedersehen!");
        rl.close();
        return;
      }

      if (!trimmed) {
        askQuestion();
        return;
      }

      try {
        console.log("\n⏳ Denke nach...\n");

        // Streaming-Ausgabe
        process.stdout.write("💬 Assistent: ");

        for await (const chunk of pipeline.queryStream(
          trimmed,
          { topK: parseInt(options.topK) },
          { model: options.model }
        )) {
          process.stdout.write(chunk);
        }

        console.log("\n");
      } catch (error) {
        console.error("\n❌ Fehler:", error);
        console.log();
      }

      askQuestion();
    });
  };

  askQuestion();
}

program.parse();
