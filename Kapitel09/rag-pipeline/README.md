# RAG Document Pipeline

Retrieval-Augmented Generation Pipeline - Beispielcode aus Kapitel 9.

## Features

- **Document Loaders**: PDF, DOCX, Markdown, Text
- **Preprocessing**: Textbereinigung und Normalisierung
- **Chunking**: Rekursives Text-Splitting mit Overlap
- **Embeddings**: Ollama Embedding-Modelle mit Caching
- **Vector Store**: SQLite mit Cosine Similarity
- **Pipelines**: Ingestion und Query Pipelines
- **API Server**: HTTP REST API mit Streaming

## Voraussetzungen

- Node.js 18+
- Ollama läuft (`ollama serve`)
- Embedding-Modell installiert (`ollama pull nomic-embed-text`)
- LLM-Modell für Queries (`ollama pull llama3.2`)

## Installation

```bash
npm install
```

## Verwendung

### CLI

```bash
# Dokumente indexieren
npm run ingest -- ./docs

# Frage stellen
npm run query -- "Was ist RAG?"

# Interaktiver Modus
npm run query -- -i

# Statistiken anzeigen
npx tsx src/cli.ts stats

# Nur Suche (ohne Antwortgenerierung)
npx tsx src/cli.ts search "Retrieval Augmented"
```

### HTTP Server

```bash
npm run server
```

Endpoints:
- `GET /health` - Health Check
- `GET /stats` - Statistiken
- `POST /ingest` - Dokumente indexieren
- `POST /search` - Semantische Suche
- `POST /query` - RAG Query mit Antwort
- `POST /query/stream` - RAG Query mit Streaming (SSE)
- `DELETE /documents` - Dokumente löschen

### Programmatisch

```typescript
import { IngestionPipeline, QueryPipeline } from "./src/index.js";

// Ingestion
const ingestion = new IngestionPipeline({
  chunking: { chunkSize: 1000, chunkOverlap: 200 },
  embedding: { model: "nomic-embed-text" },
  vectorStore: { dbPath: "./vector.db" },
});

await ingestion.ingestDirectory("./docs");
ingestion.close();

// Query
const query = new QueryPipeline({
  vectorStore: { dbPath: "./vector.db" },
});

const result = await query.query("Meine Frage?");
console.log(result.answer);

query.close();
```

## Projektstruktur

```
rag-pipeline/
├── src/
│   ├── loaders/           # Document Loaders
│   │   ├── base-loader.ts
│   │   ├── pdf-loader.ts
│   │   ├── docx-loader.ts
│   │   ├── markdown-loader.ts
│   │   ├── text-loader.ts
│   │   └── unified-loader.ts
│   ├── processing/        # Preprocessing & Chunking
│   │   ├── preprocessor.ts
│   │   └── chunker.ts
│   ├── embedding/         # Embedding Service
│   │   └── embedding-service.ts
│   ├── storage/           # Vector Store
│   │   └── vector-store.ts
│   ├── pipeline/          # Pipelines
│   │   ├── ingestion-pipeline.ts
│   │   └── query-pipeline.ts
│   ├── types.ts           # TypeScript Types
│   ├── index.ts           # Hauptmodul
│   ├── cli.ts             # CLI Tool
│   └── server.ts          # HTTP Server
├── package.json
└── tsconfig.json
```

## Konfiguration

### Chunking

```typescript
{
  chunkSize: 1000,      // Max. Zeichen pro Chunk
  chunkOverlap: 200,    // Überlappung zwischen Chunks
  separators: ["\n\n", "\n", ". ", " ", ""],
  keepSeparator: true
}
```

### Embedding

```typescript
{
  model: "nomic-embed-text",  // Ollama Embedding-Modell
  baseUrl: "http://localhost:11434",
  batchSize: 32,
  cacheEnabled: true,
  cachePath: "./.embedding-cache"
}
```

### Vector Store

```typescript
{
  dbPath: "./vector.db",
  tableName: "documents",
  dimension: 768
}
```

## API Beispiele

### Dokumente indexieren

```bash
curl -X POST http://localhost:3001/ingest \
  -H "Content-Type: application/json" \
  -d '{"path": "./docs", "pattern": "**/*.md"}'
```

### Semantische Suche

```bash
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Was ist RAG?", "topK": 5}'
```

### RAG Query

```bash
curl -X POST http://localhost:3001/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Erkläre die Vorteile von RAG",
    "topK": 5,
    "model": "llama3.2"
  }'
```

## Technologien

- **TypeScript** - Typsicherer Code
- **pdf-parse** - PDF Extraktion
- **mammoth** - DOCX Extraktion
- **gray-matter** - Markdown Frontmatter
- **better-sqlite3** - Vector Store
- **Express** - HTTP Server
