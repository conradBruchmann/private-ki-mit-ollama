/**
 * RAG Pipeline HTTP Server
 * Kapitel 9: RAG-Architekturen
 *
 * Start: npx tsx src/server.ts
 * Port: 3001 (oder PORT env)
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { IngestionPipeline } from "./pipeline/ingestion-pipeline.js";
import { QueryPipeline } from "./pipeline/query-pipeline.js";
import { SQLiteVectorStore } from "./storage/index.js";

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || "./vector.db";

// Middleware
app.use(cors());
app.use(express.json());

// Request Logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

/**
 * GET /health
 * Health Check
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * GET /stats
 * Vector Store Statistiken
 */
app.get("/stats", (_req: Request, res: Response) => {
  const store = new SQLiteVectorStore({ dbPath: DB_PATH });
  try {
    const stats = store.getStats();
    res.json(stats);
  } finally {
    store.close();
  }
});

/**
 * POST /ingest
 * Dokumente indexieren
 * Body: { path: string, pattern?: string }
 */
app.post("/ingest", async (req: Request, res: Response) => {
  const { path, pattern = "**/*" } = req.body;

  if (!path) {
    res.status(400).json({ error: "path ist erforderlich" });
    return;
  }

  const pipeline = new IngestionPipeline({
    vectorStore: { dbPath: DB_PATH },
  });

  try {
    const fs = await import("fs/promises");
    const stat = await fs.stat(path);

    let result;
    if (stat.isDirectory()) {
      result = await pipeline.ingestDirectory(path, pattern);
    } else {
      result = await pipeline.ingestFile(path);
    }

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  } finally {
    pipeline.close();
  }
});

/**
 * POST /search
 * Semantische Suche
 * Body: { query: string, topK?: number, minScore?: number }
 */
app.post("/search", async (req: Request, res: Response) => {
  const { query, topK = 5, minScore = 0 } = req.body;

  if (!query) {
    res.status(400).json({ error: "query ist erforderlich" });
    return;
  }

  const pipeline = new QueryPipeline({
    vectorStore: { dbPath: DB_PATH },
  });

  try {
    const results = await pipeline.search(query, { topK, minScore });

    res.json({
      query,
      results: results.map((r) => ({
        content: r.chunk.content,
        score: r.score,
        metadata: r.chunk.metadata,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  } finally {
    pipeline.close();
  }
});

/**
 * POST /query
 * RAG Query mit Antwortgenerierung
 * Body: { query: string, topK?: number, model?: string, systemPrompt?: string }
 */
app.post("/query", async (req: Request, res: Response) => {
  const {
    query,
    topK = 5,
    model = "llama3.2",
    systemPrompt,
    temperature = 0.7,
  } = req.body;

  if (!query) {
    res.status(400).json({ error: "query ist erforderlich" });
    return;
  }

  const pipeline = new QueryPipeline({
    vectorStore: { dbPath: DB_PATH },
  });

  try {
    const result = await pipeline.query(
      query,
      { topK },
      { model, systemPrompt, temperature }
    );

    res.json({
      query,
      answer: result.answer,
      sources: result.context.results.map((r) => ({
        content: r.chunk.content.slice(0, 200),
        score: r.score,
        filename: r.chunk.metadata.filename,
        source: r.chunk.metadata.source,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  } finally {
    pipeline.close();
  }
});

/**
 * POST /query/stream
 * RAG Query mit Streaming (SSE)
 */
app.post("/query/stream", async (req: Request, res: Response) => {
  const { query, topK = 5, model = "llama3.2", systemPrompt } = req.body;

  if (!query) {
    res.status(400).json({ error: "query ist erforderlich" });
    return;
  }

  // SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const pipeline = new QueryPipeline({
    vectorStore: { dbPath: DB_PATH },
  });

  try {
    // Zuerst Quellen senden
    const context = await pipeline.createContext(query, { topK });

    res.write(
      `data: ${JSON.stringify({
        type: "sources",
        sources: context.results.map((r) => ({
          filename: r.chunk.metadata.filename,
          score: r.score,
        })),
      })}\n\n`
    );

    // Dann Streaming-Antwort
    for await (const chunk of pipeline.queryStream(
      query,
      { topK },
      { model, systemPrompt }
    )) {
      res.write(`data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.write(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`);
    res.end();
  } finally {
    pipeline.close();
  }
});

/**
 * DELETE /documents
 * Dokumente löschen
 * Query: ?source=<filepath>
 */
app.delete("/documents", (req: Request, res: Response) => {
  const { source } = req.query;

  const store = new SQLiteVectorStore({ dbPath: DB_PATH });

  try {
    if (source && typeof source === "string") {
      store.deleteBySource(source);
      res.json({ success: true, message: `Dokumente von ${source} gelöscht` });
    } else {
      store.clear();
      res.json({ success: true, message: "Alle Dokumente gelöscht" });
    }
  } finally {
    store.close();
  }
});

// Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: err.message });
});

// Server starten
app.listen(PORT, () => {
  console.log(`
🚀 RAG Pipeline Server gestartet

   URL: http://localhost:${PORT}
   DB:  ${DB_PATH}

📚 Endpoints:
   GET  /health          - Health Check
   GET  /stats           - Statistiken
   POST /ingest          - Dokumente indexieren
   POST /search          - Semantische Suche
   POST /query           - RAG Query
   POST /query/stream    - RAG Query (SSE)
   DELETE /documents     - Dokumente löschen
`);
});
