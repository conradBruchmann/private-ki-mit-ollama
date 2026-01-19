# Minimales RAG-Beispiel

Verstehe RAG-Grundlagen in einer einzigen Datei - Kapitel 8.

## Lernziele

Dieses Beispiel zeigt die **Kernkonzepte von RAG** ohne externe Abhängigkeiten:

1. **Chunking**: Dokumente in kleinere Teile aufteilen
2. **Embeddings**: Text in Vektoren umwandeln
3. **Similarity Search**: Ähnliche Texte finden
4. **Generation**: Mit Kontext antworten

## Voraussetzungen

```bash
# Ollama starten
ollama serve

# Modelle laden
ollama pull nomic-embed-text  # Für Embeddings
ollama pull llama3.2          # Für Generation
```

## Verwendung

```bash
# Standard-Query
npx tsx minimal-rag.ts

# Eigene Frage
npx tsx minimal-rag.ts "Was ist Ollama?"
npx tsx minimal-rag.ts "Wie funktionieren Embeddings?"
```

## Ausgabe-Beispiel

```
╔════════════════════════════════════════════════════════╗
║  Minimales RAG-Beispiel                                ║
║  Kapitel 8: Grundlagen von RAG                         ║
╚════════════════════════════════════════════════════════╝

📄 8 Chunks aus 4 Dokumenten erstellt
🔄 Erstelle Embeddings für 8 Chunks...
   8/8 Chunks indiziert
✅ Indexierung abgeschlossen

============================================================
RAG Pipeline
============================================================
🔍 Suche nach: "Was ist RAG und wie funktioniert es?"
   Gefunden: 3 relevante Chunks

📚 Relevante Chunks:
   [85.2%] rag-basics
   [72.1%] embeddings
   [68.4%] chunking

🤖 Generiere Antwort...

============================================================
Antwort:
============================================================
RAG steht für Retrieval-Augmented Generation und kombiniert
Informationsabruf mit Textgenerierung. Der Prozess besteht
aus drei Schritten...
============================================================
```

## Code-Erklärung

### 1. Chunking

```typescript
// Text in überlappende Teile aufteilen
const CHUNK_SIZE = 500;    // Zeichen pro Chunk
const CHUNK_OVERLAP = 50;  // Überlappung

while (start < text.length) {
  const chunk = text.slice(start, start + CHUNK_SIZE);
  chunks.push(chunk);
  start += CHUNK_SIZE - CHUNK_OVERLAP;
}
```

**Warum Overlap?** Verhindert, dass wichtige Informationen an Chunk-Grenzen verloren gehen.

### 2. Embeddings

```typescript
// Text → Vektor
const embedding = await createEmbedding("Hallo Welt");
// [0.023, -0.156, 0.089, ...]  (768 Dimensionen)
```

**Semantische Bedeutung**: Ähnliche Texte → Ähnliche Vektoren

### 3. Cosine Similarity

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  // Winkel zwischen Vektoren messen
  // 1.0 = identisch, 0.0 = keine Ähnlichkeit
  return dotProduct(a, b) / (norm(a) * norm(b));
}
```

### 4. RAG-Pipeline

```
Frage → Embedding → Suche → Top-K Chunks → Kontext → LLM → Antwort
```

## Nächste Schritte

Nach diesem Grundlagen-Beispiel:

1. **Kapitel 9**: Vollständige RAG-Pipeline mit Vektordatenbank
2. **Kapitel 10**: RAG-Frontend mit Zugriffskontrolle

## Experimente

Verändere die Konstanten und beobachte die Auswirkungen:

```typescript
const CHUNK_SIZE = 200;   // Kleinere Chunks = präziser, aber weniger Kontext
const CHUNK_OVERLAP = 100; // Mehr Overlap = bessere Grenzübergänge
const TOP_K = 5;           // Mehr Chunks = mehr Kontext, aber auch mehr Rauschen
```
