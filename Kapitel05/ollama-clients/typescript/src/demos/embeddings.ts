/**
 * Demo: Embeddings mit Ollama
 *
 * Zeigt die Verwendung von Embeddings für Semantic Search.
 */

import ollama from "ollama";

/**
 * Kosinus-Ähnlichkeit zwischen zwei Vektoren berechnen
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function basicEmbeddings() {
  console.log("=== Basic Embeddings Demo ===\n");

  const text = "Ollama ermöglicht das lokale Ausführen von LLMs.";

  const response = await ollama.embed({
    model: "nomic-embed-text",
    input: text,
  });

  const embedding = response.embeddings[0];
  console.log(`Text: "${text}"`);
  console.log(`Dimension: ${embedding.length}`);
  console.log(`Erste 10 Werte: [${embedding.slice(0, 10).map((n) => n.toFixed(4)).join(", ")}...]`);
}

async function semanticSimilarity() {
  console.log("\n=== Semantic Similarity Demo ===\n");

  const texts = [
    "Der Hund läuft im Park.",
    "Ein Hund rennt durch den Garten.",
    "Die Katze schläft auf dem Sofa.",
    "Python ist eine Programmiersprache.",
    "JavaScript wird für Webentwicklung verwendet.",
  ];

  console.log("Texte:");
  texts.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

  // Embeddings für alle Texte generieren
  const response = await ollama.embed({
    model: "nomic-embed-text",
    input: texts,
  });

  const embeddings = response.embeddings;

  // Ähnlichkeitsmatrix berechnen
  console.log("\nÄhnlichkeitsmatrix:");
  console.log("     " + texts.map((_, i) => `  ${i + 1}  `).join(""));

  for (let i = 0; i < texts.length; i++) {
    let row = `  ${i + 1}  `;
    for (let j = 0; j < texts.length; j++) {
      const sim = cosineSimilarity(embeddings[i], embeddings[j]);
      row += ` ${sim.toFixed(2)} `;
    }
    console.log(row);
  }

  // Ähnlichste Paare finden
  console.log("\nÄhnlichste Paare (außer identisch):");
  const pairs: { i: number; j: number; sim: number }[] = [];

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      pairs.push({
        i,
        j,
        sim: cosineSimilarity(embeddings[i], embeddings[j]),
      });
    }
  }

  pairs
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 3)
    .forEach((p) => {
      console.log(`  ${p.sim.toFixed(3)}: "${texts[p.i]}" <-> "${texts[p.j]}"`);
    });
}

async function semanticSearch() {
  console.log("\n=== Semantic Search Demo ===\n");

  // Dokumente
  const documents = [
    "TypeScript ist eine typisierte Programmiersprache von Microsoft.",
    "React ist eine JavaScript-Bibliothek für Benutzeroberflächen.",
    "Docker ermöglicht die Containerisierung von Anwendungen.",
    "Kubernetes orchestriert Container in Produktionsumgebungen.",
    "PostgreSQL ist eine relationale Datenbank.",
    "MongoDB ist eine NoSQL-Dokumentendatenbank.",
    "Rust ist eine Systemprogrammiersprache mit Speichersicherheit.",
    "Python wird häufig für Machine Learning verwendet.",
  ];

  console.log("Dokumente indexiert:", documents.length);

  // Dokumente embedden
  const docResponse = await ollama.embed({
    model: "nomic-embed-text",
    input: documents,
  });
  const docEmbeddings = docResponse.embeddings;

  // Suchanfrage
  const query = "Welche Datenbanken gibt es?";
  console.log(`\nSuchanfrage: "${query}"`);

  // Query embedden
  const queryResponse = await ollama.embed({
    model: "nomic-embed-text",
    input: query,
  });
  const queryEmbedding = queryResponse.embeddings[0];

  // Ähnlichkeiten berechnen und sortieren
  const results = documents
    .map((doc, i) => ({
      doc,
      score: cosineSimilarity(queryEmbedding, docEmbeddings[i]),
    }))
    .sort((a, b) => b.score - a.score);

  // Top 3 Ergebnisse
  console.log("\nTop 3 Ergebnisse:");
  results.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.score.toFixed(3)}] ${r.doc}`);
  });
}

async function batchProcessing() {
  console.log("\n=== Batch Processing Demo ===\n");

  const texts = Array.from({ length: 10 }, (_, i) => `Dokument Nummer ${i + 1} mit Inhalt.`);

  console.log(`Verarbeite ${texts.length} Dokumente im Batch...`);

  const start = Date.now();
  const response = await ollama.embed({
    model: "nomic-embed-text",
    input: texts,
  });
  const duration = Date.now() - start;

  console.log(`Ergebnis:`);
  console.log(`  - Dokumente: ${response.embeddings.length}`);
  console.log(`  - Dimension: ${response.embeddings[0].length}`);
  console.log(`  - Dauer: ${duration}ms`);
  console.log(`  - Pro Dokument: ${(duration / texts.length).toFixed(1)}ms`);
}

async function main() {
  // Prüfen ob Embedding-Modell verfügbar
  try {
    await ollama.show({ model: "nomic-embed-text" });
  } catch {
    console.log("Embedding-Modell nicht gefunden.");
    console.log("Installieren mit: ollama pull nomic-embed-text");
    console.log("\nFahre trotzdem fort (kann fehlschlagen)...\n");
  }

  await basicEmbeddings();
  await semanticSimilarity();
  await semanticSearch();
  await batchProcessing();
}

main().catch(console.error);
