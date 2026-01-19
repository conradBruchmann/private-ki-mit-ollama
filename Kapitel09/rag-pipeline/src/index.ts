/**
 * RAG Pipeline - Hauptmodul
 * Kapitel 9: RAG-Architekturen
 *
 * Beispiel-Code für das Buch "Private KI mit Ollama"
 */

// Types
export * from "./types.js";

// Loaders
export {
  BaseLoader,
  PDFLoader,
  DocxLoader,
  MarkdownLoader,
  TextLoader,
  UnifiedLoader,
} from "./loaders/index.js";

// Processing
export {
  TextPreprocessor,
  RecursiveChunker,
  MarkdownChunker,
} from "./processing/index.js";

// Embedding
export { EmbeddingService } from "./embedding/index.js";

// Storage
export { SQLiteVectorStore } from "./storage/index.js";

// Pipelines
export { IngestionPipeline, QueryPipeline } from "./pipeline/index.js";

/**
 * Schnellstart-Beispiel
 */
async function main() {
  console.log("🚀 RAG Pipeline - Kapitel 9\n");

  // Beispiel: Dokumente indexieren und abfragen
  const { IngestionPipeline, QueryPipeline } = await import("./pipeline/index.js");

  // 1. Ingestion Pipeline erstellen
  const ingestion = new IngestionPipeline({
    chunking: {
      chunkSize: 1000,
      chunkOverlap: 200,
    },
    embedding: {
      model: "nomic-embed-text",
    },
    vectorStore: {
      dbPath: "./demo-vector.db",
    },
  });

  // Beispiel-Text erstellen
  const fs = await import("fs/promises");
  const demoDir = "./demo-docs";

  await fs.mkdir(demoDir, { recursive: true });
  await fs.writeFile(
    `${demoDir}/beispiel.md`,
    `# RAG-Systeme

RAG steht für Retrieval-Augmented Generation. Es ist eine Technik, die Sprachmodelle
mit externem Wissen erweitert.

## Wie funktioniert RAG?

1. **Retrieval**: Relevante Dokumente werden aus einer Wissensbasis abgerufen
2. **Augmentation**: Die gefundenen Informationen werden dem Prompt hinzugefügt
3. **Generation**: Das Sprachmodell generiert eine Antwort basierend auf dem Kontext

## Vorteile von RAG

- Aktuelle Informationen ohne erneutes Training
- Nachvollziehbare Quellen
- Geringere Halluzinationen
- Domänenspezifisches Wissen
`
  );

  // 2. Dokumente indexieren
  console.log("📄 Indexiere Demo-Dokumente...\n");
  await ingestion.ingestDirectory(demoDir);
  ingestion.close();

  // 3. Query Pipeline erstellen
  const query = new QueryPipeline({
    vectorStore: {
      dbPath: "./demo-vector.db",
    },
  });

  // 4. Frage stellen
  console.log("\n❓ Frage: Was ist RAG?\n");

  const result = await query.query("Was ist RAG und wie funktioniert es?");

  console.log("💬 Antwort:");
  console.log(result.answer);

  console.log("\n📚 Quellen:");
  for (const r of result.context.results) {
    console.log(`   - ${r.chunk.metadata.filename} (Score: ${(r.score * 100).toFixed(1)}%)`);
  }

  query.close();

  // Aufräumen
  await fs.rm(demoDir, { recursive: true });
  await fs.unlink("./demo-vector.db").catch(() => {});

  console.log("\n✅ Demo abgeschlossen!");
}

// Nur ausführen wenn direkt aufgerufen
const isMainModule = process.argv[1]?.endsWith("index.ts") ||
                     process.argv[1]?.endsWith("index.js");

if (isMainModule) {
  main().catch(console.error);
}
