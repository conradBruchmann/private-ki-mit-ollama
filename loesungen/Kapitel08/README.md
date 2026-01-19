# Lösungen Kapitel 8: Grundlagen von RAG

## Übung 1: Embedding-Vergleich mit Heatmap

```typescript
// embedding-heatmap.ts
import Ollama from 'ollama';

const ollama = new Ollama();

async function getEmbedding(text: string): Promise<number[]> {
  const response = await ollama.embed({
    model: 'nomic-embed-text',
    input: text
  });
  return response.embeddings[0];
}

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

async function main() {
  const sentences = [
    "Python ist eine Programmiersprache",
    "JavaScript wird für Webentwicklung verwendet",
    "Machine Learning erfordert viele Daten",
    "Neuronale Netze imitieren das Gehirn",
    "SQL ist für Datenbankabfragen",
    "Docker containerisiert Anwendungen",
    "Kubernetes orchestriert Container",
    "REST APIs nutzen HTTP",
    "GraphQL ist eine Alternative zu REST",
    "TypeScript erweitert JavaScript"
  ];

  console.log("Generiere Embeddings...");
  const embeddings = await Promise.all(
    sentences.map(s => getEmbedding(s))
  );

  // Similarity Matrix berechnen
  const matrix: number[][] = [];
  for (let i = 0; i < embeddings.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < embeddings.length; j++) {
      matrix[i][j] = cosineSimilarity(embeddings[i], embeddings[j]);
    }
  }

  // ASCII Heatmap ausgeben
  console.log("\nÄhnlichkeits-Matrix (Heatmap):\n");
  console.log("   " + sentences.map((_, i) => i.toString().padStart(3)).join(""));
  
  for (let i = 0; i < matrix.length; i++) {
    let row = i.toString().padStart(2) + " ";
    for (let j = 0; j < matrix[i].length; j++) {
      const sim = matrix[i][j];
      // ASCII-Zeichen basierend auf Ähnlichkeit
      const char = sim > 0.9 ? "█" : sim > 0.7 ? "▓" : sim > 0.5 ? "▒" : sim > 0.3 ? "░" : " ";
      row += ` ${char} `;
    }
    row += ` ${sentences[i].slice(0, 30)}...`;
    console.log(row);
  }

  // Top 5 ähnlichste Paare
  console.log("\n\nTop 5 ähnlichste Paare:");
  const pairs: {i: number; j: number; sim: number}[] = [];
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) {
      pairs.push({ i, j, sim: matrix[i][j] });
    }
  }
  pairs.sort((a, b) => b.sim - a.sim);
  
  for (const pair of pairs.slice(0, 5)) {
    console.log(`\n[${(pair.sim * 100).toFixed(1)}%]`);
    console.log(`  "${sentences[pair.i]}"`);
    console.log(`  "${sentences[pair.j]}"`);
  }
}

main().catch(console.error);
```

---

## Übung 2: Chunking-Experiment

```typescript
// chunking-experiment.ts
import { readFileSync } from 'fs';
import Ollama from 'ollama';

const ollama = new Ollama();

interface Chunk {
  text: string;
  index: number;
}

function chunkText(text: string, chunkSize: number, overlap: number = 50): Chunk[] {
  const chunks: Chunk[] = [];
  let index = 0;
  
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push({
      text: text.slice(i, i + chunkSize),
      index: index++
    });
  }
  
  return chunks;
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await ollama.embed({
    model: 'nomic-embed-text',
    input: text
  });
  return response.embeddings[0];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function testChunkSize(
  document: string, 
  chunkSize: number, 
  query: string
): Promise<{ chunkSize: number; topChunk: string; similarity: number }> {
  
  const chunks = chunkText(document, chunkSize);
  console.log(`Chunk-Size ${chunkSize}: ${chunks.length} Chunks`);
  
  // Embeddings für alle Chunks
  const chunkEmbeddings = await Promise.all(
    chunks.map(c => getEmbedding(c.text))
  );
  
  // Query-Embedding
  const queryEmbedding = await getEmbedding(query);
  
  // Besten Chunk finden
  let bestIdx = 0;
  let bestSim = -1;
  
  for (let i = 0; i < chunkEmbeddings.length; i++) {
    const sim = cosineSimilarity(queryEmbedding, chunkEmbeddings[i]);
    if (sim > bestSim) {
      bestSim = sim;
      bestIdx = i;
    }
  }
  
  return {
    chunkSize,
    topChunk: chunks[bestIdx].text.slice(0, 100) + "...",
    similarity: bestSim
  };
}

async function main() {
  // Dokument laden (oder Beispieltext)
  const document = `
    Machine Learning ist ein Teilgebiet der künstlichen Intelligenz.
    Es ermöglicht Computern, aus Daten zu lernen, ohne explizit programmiert zu werden.
    Supervised Learning nutzt gelabelte Daten für Training.
    Unsupervised Learning findet Muster in ungelabelten Daten.
    Deep Learning verwendet neuronale Netze mit vielen Schichten.
    Reinforcement Learning lernt durch Belohnungen und Strafen.
    Natural Language Processing verarbeitet menschliche Sprache.
    Computer Vision analysiert Bilder und Videos.
    Generative AI kann neue Inhalte erstellen.
    Large Language Models verstehen und generieren Text.
  `.repeat(10); // Dokument künstlich verlängern

  const query = "Wie lernen Computer ohne Programmierung?";
  const chunkSizes = [200, 500, 1000];

  console.log(`Dokument: ${document.length} Zeichen`);
  console.log(`Query: "${query}"\n`);

  const results = [];
  for (const size of chunkSizes) {
    const result = await testChunkSize(document, size, query);
    results.push(result);
  }

  console.log("\n--- Ergebnisse ---\n");
  for (const r of results) {
    console.log(`Chunk-Size: ${r.chunkSize}`);
    console.log(`  Similarity: ${(r.similarity * 100).toFixed(1)}%`);
    console.log(`  Top Chunk: ${r.topChunk}\n`);
  }
}

main().catch(console.error);
```

**Erwartete Beobachtungen:**
- Kleine Chunks (200): Präzisere Treffer, aber weniger Kontext
- Mittlere Chunks (500): Gute Balance
- Große Chunks (1000): Mehr Kontext, aber unpräzisere Treffer

---

## Übung 3: RAG-Prototyp

```typescript
// minimal-rag.ts
import { ChromaClient } from 'chromadb';
import Ollama from 'ollama';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

const ollama = new Ollama();
const chroma = new ChromaClient();

async function embedText(text: string): Promise<number[]> {
  const response = await ollama.embed({
    model: 'nomic-embed-text',
    input: text
  });
  return response.embeddings[0];
}

async function ingestDocuments(docsPath: string, collectionName: string) {
  const collection = await chroma.getOrCreateCollection({ name: collectionName });
  
  const files = readdirSync(docsPath).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const content = readFileSync(join(docsPath, file), 'utf-8');
    const chunks = content.match(/.{1,500}/g) || [];
    
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);
      
      await collection.add({
        ids: [`${file}-${i}`],
        embeddings: [embedding],
        documents: [chunks[i]],
        metadatas: [{ source: file, chunk: i }]
      });
    }
    console.log(`Ingested: ${file} (${chunks.length} chunks)`);
  }
  
  return collection;
}

async function query(collection: any, question: string): Promise<string> {
  // 1. Relevante Chunks finden
  const queryEmbedding = await embedText(question);
  
  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: 3
  });
  
  const context = results.documents[0].join('\n\n');
  
  // 2. LLM mit Kontext fragen
  const prompt = `Beantworte die Frage basierend auf dem folgenden Kontext.
Wenn die Antwort nicht im Kontext zu finden ist, sage "Das kann ich aus den vorliegenden Dokumenten nicht beantworten."

Kontext:
${context}

Frage: ${question}

Antwort:`;

  const response = await ollama.generate({
    model: 'llama3.2',
    prompt,
    stream: false
  });
  
  return response.response;
}

async function main() {
  const DOCS_PATH = './docs';  // Ordner mit Markdown-Dateien
  const COLLECTION = 'my-knowledge';
  
  console.log('Ingestiere Dokumente...');
  const collection = await ingestDocuments(DOCS_PATH, COLLECTION);
  
  // CLI Interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\nRAG-System bereit. Stellen Sie Fragen (exit zum Beenden):\n');
  
  const askQuestion = () => {
    rl.question('> ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        return;
      }
      
      const answer = await query(collection, input);
      console.log(`\n${answer}\n`);
      askQuestion();
    });
  };
  
  askQuestion();
}

main().catch(console.error);
```

---

## Übung 4: Halluzinations-Test

```typescript
// hallucination-test.ts
import { ChromaClient } from 'chromadb';
import Ollama from 'ollama';

const ollama = new Ollama();
const chroma = new ChromaClient();

async function testHallucination(collection: any, question: string) {
  const queryEmbedding = await ollama.embed({
    model: 'nomic-embed-text',
    input: question
  }).then(r => r.embeddings[0]);
  
  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: 3
  });
  
  // Similarity Scores prüfen
  const maxSimilarity = Math.max(...(results.distances?.[0] || [1]).map(d => 1 - d));
  
  const context = results.documents[0].join('\n\n');
  
  // Prompt mit expliziter Unsicherheits-Anweisung
  const prompt = `Du bist ein präziser Assistent. Beantworte die Frage NUR basierend auf dem Kontext.

WICHTIG:
- Wenn die Information NICHT im Kontext steht, antworte: "Diese Information ist in den Dokumenten nicht enthalten."
- Erfinde KEINE Informationen.
- Bewerte deine Konfidenz von 1-10.

Kontext:
${context}

Frage: ${question}

Antworte im Format:
Antwort: [Deine Antwort]
Konfidenz: [1-10]
Begründung: [Warum diese Konfidenz]`;

  const response = await ollama.generate({
    model: 'llama3.2',
    prompt,
    stream: false
  });
  
  return {
    question,
    maxSimilarity,
    response: response.response
  };
}

async function main() {
  const collection = await chroma.getOrCreateCollection({ name: 'my-knowledge' });
  
  // Fragen, die NICHT im Wissen sein sollten
  const testQuestions = [
    "Was ist die Hauptstadt von Frankreich?",  // Allgemeinwissen
    "Wie hoch ist der Mount Everest?",         // Nicht im Kontext
    "Was kostet ein Tesla Model 3?",           // Aktuelles Wissen
    "Wer hat das Internet erfunden?",          // Geschichte
  ];
  
  console.log("=== Halluzinations-Test ===\n");
  
  for (const question of testQuestions) {
    console.log(`Frage: ${question}`);
    const result = await testHallucination(collection, question);
    console.log(`Max Similarity: ${(result.maxSimilarity * 100).toFixed(1)}%`);
    console.log(`${result.response}\n`);
    console.log("-".repeat(50) + "\n");
  }
}

main().catch(console.error);
```

**Tipps zur Halluzinations-Vermeidung:**

1. **Similarity Threshold:** Wenn beste Übereinstimmung < 0.5, warnen
2. **Explizite Prompts:** "Nur aus Kontext antworten"
3. **Konfidenz-Scores:** Modell eigene Unsicherheit bewerten lassen
4. **Quellen-Angabe:** Modell muss Quelle im Kontext zitieren
