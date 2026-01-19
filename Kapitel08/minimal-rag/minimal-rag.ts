#!/usr/bin/env npx tsx
/**
 * Minimales RAG-Beispiel - Alles in einer Datei
 * Kapitel 8: Grundlagen von RAG
 *
 * Dieses Skript zeigt die RAG-Grundlagen OHNE externe Datenbank:
 * 1. Dokumente laden
 * 2. In Chunks aufteilen
 * 3. Embeddings erstellen (im Speicher)
 * 4. Ähnlichste Chunks finden
 * 5. Mit LLM antworten
 *
 * Verwendung:
 *   npx tsx minimal-rag.ts
 *   npx tsx minimal-rag.ts "Was ist Ollama?"
 */

// =============================================================================
// Konfiguration
// =============================================================================

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text';  // Embedding-Modell
const CHAT_MODEL = 'llama3.2';           // Chat-Modell
const CHUNK_SIZE = 500;                  // Zeichen pro Chunk
const CHUNK_OVERLAP = 50;                // Überlappung zwischen Chunks
const TOP_K = 3;                         // Anzahl relevanter Chunks

// =============================================================================
// Beispiel-Dokumente (In echter Anwendung: Dateien laden)
// =============================================================================

const DOCUMENTS = [
  {
    id: 'ollama-intro',
    title: 'Was ist Ollama?',
    content: `Ollama ist ein Open-Source-Tool zum lokalen Ausführen von Large Language Models (LLMs).
Es ermöglicht das Herunterladen, Verwalten und Ausführen von KI-Modellen auf dem eigenen Computer.
Ollama unterstützt verschiedene Modelle wie Llama, Mistral, Qwen und viele mehr.
Die Installation ist einfach: Unter macOS mit brew install ollama, unter Linux mit curl.
Nach der Installation können Modelle mit ollama pull heruntergeladen werden.
Die API ist REST-basiert und läuft standardmäßig auf Port 11434.`
  },
  {
    id: 'rag-basics',
    title: 'RAG Grundlagen',
    content: `RAG steht für Retrieval-Augmented Generation.
Es kombiniert Informationsabruf (Retrieval) mit Textgenerierung (Generation).
Der Prozess besteht aus drei Schritten: Indexierung, Retrieval und Generation.
Bei der Indexierung werden Dokumente in Chunks aufgeteilt und als Vektoren gespeichert.
Beim Retrieval werden die relevantesten Chunks zur Benutzeranfrage gefunden.
Bei der Generation wird ein LLM mit den gefundenen Chunks als Kontext aufgerufen.
Vorteile von RAG: Aktuelle Informationen, weniger Halluzinationen, nachvollziehbare Quellen.`
  },
  {
    id: 'embeddings',
    title: 'Was sind Embeddings?',
    content: `Embeddings sind numerische Vektoren, die die Bedeutung von Text repräsentieren.
Ähnliche Texte haben ähnliche Vektoren (kleine Distanz im Vektorraum).
Ein typisches Embedding hat 384 bis 4096 Dimensionen.
Ollama unterstützt Embedding-Modelle wie nomic-embed-text und mxbai-embed-large.
Die Ähnlichkeit zwischen Vektoren wird oft mit Cosine Similarity berechnet.
Cosine Similarity = 1 bedeutet identisch, 0 bedeutet orthogonal (keine Ähnlichkeit).
Embeddings ermöglichen semantische Suche: "Hund" findet auch "Welpe" und "Haustier".`
  },
  {
    id: 'chunking',
    title: 'Chunking-Strategien',
    content: `Chunking ist das Aufteilen von Dokumenten in kleinere Teile.
Die Chunk-Größe beeinflusst die Qualität: Zu groß = zu viel irrelevanter Kontext.
Zu klein = Kontext geht verloren, semantisch zusammenhängende Informationen werden getrennt.
Eine typische Chunk-Größe liegt zwischen 200 und 1000 Tokens.
Overlap bedeutet, dass aufeinanderfolgende Chunks sich überlappen.
Dies verhindert, dass wichtige Informationen an Chunk-Grenzen verloren gehen.
Fortgeschrittene Strategien: Sentence Splitting, Semantic Chunking, Recursive Chunking.`
  }
];

// =============================================================================
// Types
// =============================================================================

interface Chunk {
  id: string;
  documentId: string;
  text: string;
  embedding?: number[];
}

interface SearchResult {
  chunk: Chunk;
  score: number;
}

// =============================================================================
// Chunking
// =============================================================================

function createChunks(documents: typeof DOCUMENTS): Chunk[] {
  const chunks: Chunk[] = [];

  for (const doc of documents) {
    const text = doc.content;
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      const chunkText = text.slice(start, end).trim();

      if (chunkText.length > 0) {
        chunks.push({
          id: `${doc.id}-chunk-${chunkIndex}`,
          documentId: doc.id,
          text: chunkText
        });
        chunkIndex++;
      }

      // Nächster Start mit Overlap
      start = end - CHUNK_OVERLAP;
      if (start >= text.length - CHUNK_OVERLAP) break;
    }
  }

  console.log(`📄 ${chunks.length} Chunks aus ${documents.length} Dokumenten erstellt`);
  return chunks;
}

// =============================================================================
// Embeddings
// =============================================================================

async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text
    })
  });

  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.status}`);
  }

  const data = await response.json();
  return data.embeddings[0];
}

async function indexChunks(chunks: Chunk[]): Promise<Chunk[]> {
  console.log(`🔄 Erstelle Embeddings für ${chunks.length} Chunks...`);

  for (let i = 0; i < chunks.length; i++) {
    chunks[i].embedding = await createEmbedding(chunks[i].text);
    process.stdout.write(`\r   ${i + 1}/${chunks.length} Chunks indiziert`);
  }

  console.log('\n✅ Indexierung abgeschlossen');
  return chunks;
}

// =============================================================================
// Similarity Search
// =============================================================================

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

async function search(query: string, chunks: Chunk[], topK: number = TOP_K): Promise<SearchResult[]> {
  console.log(`🔍 Suche nach: "${query}"`);

  // Query-Embedding erstellen
  const queryEmbedding = await createEmbedding(query);

  // Ähnlichkeit für alle Chunks berechnen
  const results: SearchResult[] = chunks
    .filter(chunk => chunk.embedding)
    .map(chunk => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding!)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  console.log(`   Gefunden: ${results.length} relevante Chunks`);
  return results;
}

// =============================================================================
// Generation
// =============================================================================

async function generate(query: string, context: string): Promise<string> {
  const systemPrompt = `Du bist ein hilfreicher Assistent. Beantworte die Frage basierend auf dem gegebenen Kontext.
Wenn der Kontext die Frage nicht beantwortet, sage das ehrlich.
Antworte auf Deutsch.`;

  const userPrompt = `Kontext:
${context}

Frage: ${query}`;

  console.log('🤖 Generiere Antwort...');

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: false,
      options: { temperature: 0.3 }
    })
  });

  if (!response.ok) {
    throw new Error(`Generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.message.content;
}

// =============================================================================
// RAG Pipeline
// =============================================================================

async function rag(query: string, chunks: Chunk[]): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('RAG Pipeline');
  console.log('='.repeat(60));

  // 1. Retrieval
  const results = await search(query, chunks);

  // 2. Kontext aufbauen
  console.log('\n📚 Relevante Chunks:');
  const contextParts: string[] = [];

  for (const result of results) {
    console.log(`   [${(result.score * 100).toFixed(1)}%] ${result.chunk.documentId}`);
    contextParts.push(result.chunk.text);
  }

  const context = contextParts.join('\n\n---\n\n');

  // 3. Generation
  const answer = await generate(query, context);

  console.log('\n' + '='.repeat(60));
  console.log('Antwort:');
  console.log('='.repeat(60));
  console.log(answer);
  console.log('='.repeat(60) + '\n');
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Minimales RAG-Beispiel                                ║');
  console.log('║  Kapitel 8: Grundlagen von RAG                         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Ollama prüfen
  try {
    const check = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!check.ok) throw new Error();
  } catch {
    console.error('❌ Ollama nicht erreichbar!');
    console.error(`   URL: ${OLLAMA_URL}`);
    console.error('   Starte Ollama mit: ollama serve');
    process.exit(1);
  }

  // Modelle prüfen
  console.log('📋 Prüfe Modelle...');
  console.log(`   Embed: ${EMBED_MODEL}`);
  console.log(`   Chat: ${CHAT_MODEL}\n`);

  // 1. Chunking
  const chunks = createChunks(DOCUMENTS);

  // 2. Indexierung
  const indexedChunks = await indexChunks(chunks);

  // 3. RAG ausführen
  const query = process.argv[2] || 'Was ist RAG und wie funktioniert es?';
  await rag(query, indexedChunks);

  // Weitere Beispiel-Queries
  console.log('💡 Weitere Beispiele:');
  console.log('   npx tsx minimal-rag.ts "Was ist Ollama?"');
  console.log('   npx tsx minimal-rag.ts "Wie funktionieren Embeddings?"');
  console.log('   npx tsx minimal-rag.ts "Was ist die optimale Chunk-Größe?"');
}

main().catch(console.error);
