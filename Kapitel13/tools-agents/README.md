# Tools & Agenten auf Ollama-Basis

Vollständiges Tool-System und autonome Agenten für lokale LLMs - Beispielcode aus Kapitel 12.

## Features

- **Tool-System**: Modulare Tools für Dateisystem, Git, Build & Tests
- **Tool-Registry**: Zentrale Verwaltung und Kategorisierung
- **ReAct Agent**: Autonome Aufgabenausführung mit Reasoning + Acting
- **Orchestrierter Workflow**: Strukturierte, vorhersagbare Abläufe
- **Security Sandbox**: Schutz vor gefährlichen Operationen

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    Tool & Agent System                      │
│                                                             │
│  TOOLS         → FileSystem, Git, Build, Test, Lint        │
│  REGISTRY      → Zentrale Tool-Verwaltung                   │
│  REACT AGENT   → Autonome Tool-Nutzung                     │
│  WORKFLOW      → Orchestrierte Schritte                     │
│  SANDBOX       → Sicherheit und Isolation                   │
└─────────────────────────────────────────────────────────────┘
```

## Voraussetzungen

- Node.js 18+
- Ollama mit einem Modell

```bash
# Modell installieren
ollama pull llama3.2

# Oder für Code-Aufgaben
ollama pull qwen2.5-coder:14b
```

## Installation

```bash
npm install
```

## CLI-Verwendung

### Agent ausführen

```bash
# Einfache Aufgabe
npm run cli -- agent "Analysiere die Projektstruktur"

# Mit Optionen
npm run cli -- agent "Füge eine README hinzu" \
  --project ./my-project \
  --model qwen2.5-coder:14b \
  --verbose

# Mit Sandbox (sicherer Modus)
npm run cli -- agent "Lies die package.json" --sandbox
```

### Feature entwickeln

```bash
# Feature implementieren
npm run cli -- feature "Füge User-Validierung hinzu" \
  --project ./my-project

# Bug fixen
npm run cli -- feature "Behebe den TypeError in auth.ts" \
  --project ./my-project
```

### Workflow ausführen

```bash
npm run cli -- workflow "Implementiere eine Login-Funktion" \
  --project ./my-project \
  --verbose
```

### Tools verwalten

```bash
# Alle Tools anzeigen
npm run cli -- tools

# Tool direkt testen
npm run cli -- test-tool list_directory '{"path": "src"}'
npm run cli -- test-tool search_code '{"pattern": "function"}'
```

### Modelle anzeigen

```bash
npm run cli -- models
```

## Programmatische Verwendung

### Einfacher Tool-Aufruf

```typescript
import { createDefaultRegistry } from 'tools-agents';

const tools = createDefaultRegistry('./my-project');

// Datei lesen
const result = await tools.execute('read_file', { path: 'package.json' });

// Code suchen
const search = await tools.execute('search_code', {
  pattern: 'function.*async',
  filePattern: '**/*.ts'
});
```

### ReAct Agent

```typescript
import { OllamaClient, createDefaultRegistry, ReactAgent } from 'tools-agents';

const client = new OllamaClient();
const tools = createDefaultRegistry('./my-project');

const agent = new ReactAgent(client, tools, {
  model: 'qwen2.5-coder:14b',
  maxIterations: 15,
  verbose: true
});

const result = await agent.run('Füge Eingabevalidierung zur User-Klasse hinzu');

console.log('Erfolg:', result.success);
console.log('Antwort:', result.response);
```

### Feature Agent

```typescript
import { FeatureAgent } from 'tools-agents';

const agent = new FeatureAgent({
  projectRoot: './my-project',
  model: 'qwen2.5-coder:14b',
  autoValidate: true
});

// Feature implementieren
await agent.implement('Füge Dark Mode Toggle hinzu');

// Bug fixen
await agent.fixBug('Login funktioniert nicht mit Sonderzeichen');

// Refactoring
await agent.refactor('Extrahiere Auth-Logik in eigene Klasse');
```

### Orchestrierter Workflow

```typescript
import { createCodeWorkflow } from 'tools-agents';

const workflow = createCodeWorkflow('./my-project', {
  verbose: true,
  models: {
    planner: 'llama3.2',
    coder: 'qwen2.5-coder:14b',
    tester: 'llama3.2',
    reviewer: 'llama3.2'
  }
});

const result = await workflow.execute('Implementiere REST-API für User-CRUD');

for (const step of result.steps) {
  console.log(`${step.step}: ${step.success ? '✓' : '✗'}`);
}
```

### Mit Sandbox

```typescript
import { createSandbox, createDefaultRegistry } from 'tools-agents';

const tools = createDefaultRegistry('./my-project');
const sandbox = createSandbox('./my-project', {
  readOnly: false,
  enableAudit: true,
  blockedPatterns: [/\.env/, /secrets/]
});

// Tools mit Sandbox wrappen
sandbox.wrapRegistry(tools);

// Jetzt sind alle Zugriffe geschützt
const result = await tools.execute('read_file', { path: '.env' });
// → { success: false, error: 'Path matches blocked pattern' }
```

## Verfügbare Tools

### Dateisystem

| Tool | Beschreibung |
|------|--------------|
| `read_file` | Datei lesen |
| `write_file` | Datei schreiben |
| `patch_file` | Text in Datei ersetzen |
| `delete_file` | Datei löschen |
| `list_directory` | Verzeichnis auflisten |
| `search_code` | Code durchsuchen |
| `find_replace` | Mehrere Dateien bearbeiten |

### Git

| Tool | Beschreibung |
|------|--------------|
| `git_status` | Status anzeigen |
| `git_diff` | Änderungen anzeigen |
| `git_commit` | Commit erstellen |
| `git_branch` | Branches verwalten |
| `git_log` | Historie anzeigen |

### Build & Test

| Tool | Beschreibung |
|------|--------------|
| `run_tests` | Tests ausführen |
| `type_check` | TypeScript prüfen |
| `lint` | Linting durchführen |
| `run_command` | Shell-Befehl ausführen |

## Agent-Patterns

### ReAct vs. Workflow

| Aspekt | ReAct Agent | Workflow |
|--------|-------------|----------|
| Flexibilität | Hoch | Mittel |
| Vorhersagbarkeit | Gering | Hoch |
| Debugging | Schwierig | Einfach |
| Anwendungsfall | Exploration | Standardaufgaben |

## Sicherheit

Die Sandbox schützt vor:

- **Pfad-Escaping**: Keine Zugriffe außerhalb des Projekts
- **Sensitive Dateien**: .env, credentials, secrets blockiert
- **Gefährliche Befehle**: rm -rf, sudo, etc. blockiert
- **Große Dateien**: Konfigurierbare Größenlimits
- **Audit-Logging**: Alle Zugriffe protokollierbar

## Projektstruktur

```
tools-agents/
├── src/
│   ├── llm/
│   │   └── ollama-client.ts     # Ollama API Client
│   ├── tools/
│   │   ├── types.ts             # Tool-Interfaces
│   │   ├── registry.ts          # Tool-Registry
│   │   ├── file-tools.ts        # Datei-Tools
│   │   ├── advanced-file-tools.ts
│   │   ├── git-tools.ts         # Git-Tools
│   │   ├── build-tools.ts       # Build/Test-Tools
│   │   └── index.ts
│   ├── agents/
│   │   ├── react-agent.ts       # ReAct Implementation
│   │   ├── feature-agent.ts     # Feature-Entwicklung
│   │   └── index.ts
│   ├── workflows/
│   │   ├── code-workflow.ts     # Orchestrierter Workflow
│   │   └── index.ts
│   ├── security/
│   │   ├── sandbox.ts           # Security Sandbox
│   │   └── index.ts
│   ├── cli.ts                   # CLI-Tool
│   └── index.ts                 # Main Export
├── examples/
│   └── example-usage.ts         # Beispiele
├── package.json
├── tsconfig.json
└── README.md
```

## Empfohlene Modelle

| Aufgabe | Modell | Größe |
|---------|--------|-------|
| Allgemein | llama3.2 | 3B |
| Code | qwen2.5-coder:7b | 7B |
| Komplexer Code | qwen2.5-coder:14b | 14B |
| Planung | llama3.2 | 3B |

## Troubleshooting

### Ollama nicht erreichbar

```bash
# Ollama starten
ollama serve

# Status prüfen
curl http://localhost:11434/api/tags
```

### Tool schlägt fehl

```bash
# Tool direkt testen
npm run cli -- test-tool <tool-name> '<json-args>'

# Mit Verbose-Mode
npm run cli -- agent "Aufgabe" --verbose
```

### Agent "verirrt" sich

- `maxIterations` reduzieren
- Klarere Aufgabenbeschreibung
- Workflow statt Agent verwenden

## Erweiterungen

1. **Neue Tools**: Implementiere `Tool`-Interface
2. **Custom Workflows**: Eigene Steps definieren
3. **RAG-Integration**: Dokumenten-Kontext hinzufügen
4. **MCP-Support**: Model Context Protocol anbinden
