# Coding Agent - Programmierautomat

Agent-basiertes Coding System - Beispielcode aus Kapitel 11.

## Features

- **Multi-Agent System**: Planner, Coder, Tester, Reviewer
- **Tool-System**: Dateisystem, Shell, Git, Code-Suche
- **Orchestrator**: Koordiniert Agenten und Workflow
- **Model Router**: Intelligente Modell-Auswahl
- **CLI & Server**: Mehrere Interfaces

## Voraussetzungen

- Node.js 18+
- Ollama läuft (`ollama serve`)
- Empfohlene Modelle:
  - `ollama pull llama3.2` (Reasoning)
  - `ollama pull qwen2.5-coder:7b` (Coding)

## Installation

```bash
npm install
```

## Verwendung

### CLI

```bash
# Einfacher Task
npx tsx src/cli.ts task \
  --type feature \
  --title "Add hello function" \
  --project ./my-project \
  --language typescript

# Mit Beschreibung
npx tsx src/cli.ts task \
  --type bugfix \
  --title "Fix null error" \
  --description "Handle null values in user service" \
  --project ./my-project

# Interaktiver Modus
npx tsx src/cli.ts interactive --project ./my-project

# Modelle anzeigen
npx tsx src/cli.ts models
```

### HTTP Server

```bash
npx tsx src/server.ts
```

Endpoints:
- `GET /health` - Health Check
- `GET /models` - Verfügbare Modelle
- `GET /tasks` - Alle Tasks
- `POST /tasks` - Task erstellen
- `POST /tasks/:id/execute` - Task ausführen
- `POST /tasks/run` - Erstellen + Ausführen
- `GET /tasks/:id` - Task-Status
- `DELETE /tasks/:id` - Task löschen

```bash
# Task erstellen und ausführen
curl -X POST http://localhost:3002/tasks/run \
  -H "Content-Type: application/json" \
  -d '{
    "type": "feature",
    "title": "Add greeting function",
    "description": "Create a function that returns Hello World",
    "projectPath": "/path/to/project",
    "language": "typescript"
  }'
```

### Programmatisch

```typescript
import { AgentOrchestrator, createTask } from "./src/index.js";

const task = createTask(
  "feature",
  "Add login function",
  "Implement user login with email and password",
  {
    projectPath: "./my-project",
    language: "typescript",
    framework: "express",
  }
);

const orchestrator = new AgentOrchestrator({
  projectRoot: "./my-project",
  models: {
    planner: "llama3.2",
    coder: "qwen2.5-coder:7b",
    tester: "llama3.2",
    reviewer: "llama3.2",
  },
});

const result = await orchestrator.executeTask(task);
console.log(result.status, result.result);
```

## Projektstruktur

```
coding-agent/
├── src/
│   ├── types/
│   │   ├── task.ts          # Task-Typdefinitionen
│   │   └── message.ts       # LLM-Message Types
│   ├── tools/
│   │   ├── types.ts         # Tool-Interface
│   │   ├── filesystem-tools.ts  # Read, Write, Search
│   │   ├── shell-tool.ts    # Command Execution
│   │   └── git-tool.ts      # Git Operations
│   ├── llm/
│   │   └── ollama-client.ts # Ollama API Client
│   ├── agents/
│   │   ├── base-agent.ts    # Basis-Klasse
│   │   ├── planner-agent.ts # Erstellt Pläne
│   │   ├── coder-agent.ts   # Schreibt Code
│   │   ├── tester-agent.ts  # Tests
│   │   └── reviewer-agent.ts # Code-Review
│   ├── models/
│   │   └── model-router.ts  # Modell-Auswahl
│   ├── orchestration/
│   │   └── orchestrator.ts  # Agent-Koordination
│   ├── cli.ts               # CLI Tool
│   ├── server.ts            # HTTP Server
│   └── index.ts             # Hauptmodul
├── package.json
└── tsconfig.json
```

## Task-Typen

| Typ | Beschreibung |
|-----|--------------|
| `feature` | Neue Funktionalität implementieren |
| `bugfix` | Fehler beheben |
| `refactor` | Code verbessern |
| `test` | Tests schreiben |
| `docs` | Dokumentation |
| `review` | Code-Review |

## Agent-System

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator                       │
│                                                             │
│  1. PLANNING    →  Planner Agent analysiert, erstellt Plan │
│  2. EXECUTING   →  Coder Agent implementiert Schritte      │
│  3. VALIDATING  →  Tester Agent führt Tests aus            │
│  4. REVIEWING   →  Reviewer Agent prüft Qualität           │
└─────────────────────────────────────────────────────────────┘
```

## Tools

| Tool | Beschreibung |
|------|--------------|
| `read_file` | Datei lesen |
| `write_file` | Datei schreiben |
| `list_files` | Dateien auflisten |
| `search_code` | Code durchsuchen |
| `run_command` | Shell-Befehl ausführen |
| `git` | Git-Operationen |

## Modell-Empfehlungen

| Agent | Empfohlenes Modell |
|-------|-------------------|
| Planner | `llama3.2` |
| Coder | `qwen2.5-coder:7b` oder `qwen2.5-coder:14b` |
| Tester | `llama3.2` |
| Reviewer | `llama3.2` |

## Sicherheit

- Befehle werden gegen Whitelist geprüft
- Dateizugriff nur innerhalb Projektverzeichnis
- Gefährliche Patterns werden blockiert
- Keine `rm -rf`, `sudo`, etc.
