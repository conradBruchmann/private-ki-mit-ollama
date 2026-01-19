/**
 * Coding Agent HTTP Server
 * Kapitel 11: Architektur eines Programmierautomaten
 *
 * Start: npx tsx src/server.ts
 * Port: 3002 (oder PORT env)
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createTask, TaskType, TaskContext, Task } from "./types/task.js";
import { AgentOrchestrator } from "./orchestration/orchestrator.js";
import { OllamaClient } from "./llm/ollama-client.js";

const app = express();
const PORT = process.env.PORT || 3002;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

// Middleware
app.use(cors());
app.use(express.json());

// Request Logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Task-Store (in-memory, für Demo)
const tasks = new Map<string, Task>();
const runningTasks = new Map<string, Promise<Task>>();

/**
 * GET /health
 */
app.get("/health", async (_req: Request, res: Response) => {
  const ollama = new OllamaClient({ baseUrl: OLLAMA_URL });
  let ollamaStatus = "disconnected";

  try {
    const models = await ollama.listModels();
    ollamaStatus = `connected (${models.length} models)`;
  } catch {
    // Disconnected
  }

  res.json({
    status: "ok",
    ollama: ollamaStatus,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /models
 */
app.get("/models", async (_req: Request, res: Response) => {
  const ollama = new OllamaClient({ baseUrl: OLLAMA_URL });

  try {
    const models = await ollama.listModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

/**
 * POST /tasks
 * Erstellt einen neuen Task
 */
app.post("/tasks", (req: Request, res: Response) => {
  const {
    type,
    title,
    description,
    projectPath,
    language = "typescript",
    framework,
    files = [],
  } = req.body;

  if (!type || !title || !projectPath) {
    res.status(400).json({
      error: "type, title, and projectPath are required",
    });
    return;
  }

  const context: TaskContext = {
    projectPath,
    language,
    framework,
    relevantFiles: files,
    userInstructions: description,
    constraints: {
      allowNewFiles: true,
      allowDeleteFiles: false,
    },
  };

  const task = createTask(type as TaskType, title, description || title, context);
  tasks.set(task.id, task);

  res.status(201).json({
    id: task.id,
    status: task.status,
    message: "Task created. Use POST /tasks/:id/execute to run it.",
  });
});

/**
 * GET /tasks/:id
 * Task-Status abrufen
 */
app.get("/tasks/:id", (req: Request, res: Response) => {
  const task = tasks.get(req.params.id);

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json({
    id: task.id,
    type: task.type,
    status: task.status,
    title: task.title,
    plan: task.plan,
    currentStep: task.currentStep,
    totalSteps: task.plan?.steps.length || 0,
    result: task.result,
    artifacts: task.artifacts.map((a) => ({
      type: a.type,
      path: a.path,
    })),
  });
});

/**
 * POST /tasks/:id/execute
 * Task ausführen
 */
app.post("/tasks/:id/execute", async (req: Request, res: Response) => {
  const task = tasks.get(req.params.id);

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (runningTasks.has(task.id)) {
    res.status(409).json({ error: "Task is already running" });
    return;
  }

  const { models = {} } = req.body;

  const orchestrator = new AgentOrchestrator({
    projectRoot: task.context.projectPath,
    ollamaBaseUrl: OLLAMA_URL,
    models: {
      planner: models.planner || "llama3.2",
      coder: models.coder || "qwen2.5-coder:7b",
      tester: models.tester || "llama3.2",
      reviewer: models.reviewer || "llama3.2",
    },
  });

  // Task asynchron ausführen
  const execution = orchestrator.executeTask(task).then((result) => {
    tasks.set(result.id, result);
    runningTasks.delete(result.id);
    return result;
  });

  runningTasks.set(task.id, execution);

  res.json({
    id: task.id,
    status: "executing",
    message: "Task execution started. Poll GET /tasks/:id for status.",
  });
});

/**
 * POST /tasks/run
 * Erstellt und führt Task in einem Schritt aus
 */
app.post("/tasks/run", async (req: Request, res: Response) => {
  const {
    type,
    title,
    description,
    projectPath,
    language = "typescript",
    framework,
    files = [],
    models = {},
  } = req.body;

  if (!type || !title || !projectPath) {
    res.status(400).json({
      error: "type, title, and projectPath are required",
    });
    return;
  }

  const context: TaskContext = {
    projectPath,
    language,
    framework,
    relevantFiles: files,
    userInstructions: description,
    constraints: {
      allowNewFiles: true,
      allowDeleteFiles: false,
    },
  };

  const task = createTask(type as TaskType, title, description || title, context);
  tasks.set(task.id, task);

  const orchestrator = new AgentOrchestrator({
    projectRoot: projectPath,
    ollamaBaseUrl: OLLAMA_URL,
    models: {
      planner: models.planner || "llama3.2",
      coder: models.coder || "qwen2.5-coder:7b",
      tester: models.tester || "llama3.2",
      reviewer: models.reviewer || "llama3.2",
    },
  });

  try {
    const result = await orchestrator.executeTask(task);
    tasks.set(result.id, result);

    res.json({
      id: result.id,
      status: result.status,
      success: result.result?.success,
      summary: result.result?.summary,
      filesChanged: result.result?.filesChanged,
      testsRun: result.result?.testsRun,
      testsPassed: result.result?.testsPassed,
    });
  } catch (error) {
    res.status(500).json({
      error: String(error),
      taskId: task.id,
    });
  }
});

/**
 * GET /tasks
 * Alle Tasks auflisten
 */
app.get("/tasks", (_req: Request, res: Response) => {
  const allTasks = Array.from(tasks.values()).map((task) => ({
    id: task.id,
    type: task.type,
    status: task.status,
    title: task.title,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  }));

  res.json({ tasks: allTasks });
});

/**
 * DELETE /tasks/:id
 * Task löschen
 */
app.delete("/tasks/:id", (req: Request, res: Response) => {
  const task = tasks.get(req.params.id);

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (runningTasks.has(task.id)) {
    res.status(409).json({ error: "Cannot delete running task" });
    return;
  }

  tasks.delete(task.id);
  res.json({ message: "Task deleted" });
});

// Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: err.message });
});

// Server starten
app.listen(PORT, () => {
  console.log(`
🤖 Coding Agent Server gestartet

   URL:    http://localhost:${PORT}
   Ollama: ${OLLAMA_URL}

📚 Endpoints:
   GET  /health           - Health Check
   GET  /models           - Verfügbare Modelle
   GET  /tasks            - Alle Tasks
   POST /tasks            - Task erstellen
   GET  /tasks/:id        - Task-Status
   POST /tasks/:id/execute - Task ausführen
   POST /tasks/run        - Task erstellen + ausführen
   DELETE /tasks/:id      - Task löschen

📝 Beispiel:
   curl -X POST http://localhost:${PORT}/tasks/run \\
     -H "Content-Type: application/json" \\
     -d '{
       "type": "feature",
       "title": "Add hello function",
       "description": "Create a hello world function",
       "projectPath": "/path/to/project",
       "language": "typescript"
     }'
`);
});
