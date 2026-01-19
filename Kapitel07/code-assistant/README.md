# Code-Assistent mit Ollama

Lokaler KI-Copilot - Beispielcode aus Kapitel 7.

## Features

- **Code erklären**: Detaillierte Erklärung von Code-Snippets
- **Code generieren**: Funktionen nach Beschreibung erstellen
- **Tests schreiben**: Unit-Tests für bestehenden Code
- **Refactoring**: Code-Qualität verbessern
- **Dokumentation**: JSDoc/TSDoc/Docstrings hinzufügen
- **Bug-Fixing**: Fehler finden und beheben
- **Vervollständigen**: Unvollständigen Code komplettieren

## Voraussetzungen

- Node.js 18+
- Ollama mit einem Code-Modell

```bash
# Empfohlene Modelle installieren
ollama pull qwen2.5-coder:14b-instruct  # 16GB+ RAM
ollama pull qwen2.5-coder:7b-instruct   # 8GB RAM
```

## Installation

```bash
npm install
```

## CLI-Verwendung

```bash
# Code erklären
npm run cli explain src/example.ts

# Code generieren
npm run cli generate "Eine Funktion, die Duplikate entfernt" --lang typescript

# Tests schreiben
npm run cli test src/utils.ts --output src/utils.test.ts

# Code refactoren
npm run cli refactor src/legacy.ts

# Dokumentation hinzufügen
npm run cli document src/api.ts

# Bugs finden
npm run cli fix src/buggy.ts --context "TypeError: Cannot read property"

# Code vervollständigen
npm run cli complete src/incomplete.ts

# Verfügbare Modelle anzeigen
npm run cli models

# Interaktiver Modus
npm run cli interactive
```

### CLI-Optionen

| Option | Beschreibung |
|--------|--------------|
| `-m, --model <model>` | Ollama Modell (Standard: qwen2.5-coder:14b-instruct) |
| `-l, --lang <language>` | Programmiersprache |
| `-c, --context <context>` | Zusätzlicher Kontext (z.B. Error-Message) |
| `-o, --output <file>` | Ergebnis in Datei speichern |
| `--no-stream` | Streaming deaktivieren |

## Web-Interface

```bash
# Development Server starten
npm run dev
# Öffne http://localhost:3000

# Production Build
npm run build
npm run start
```

## API-Nutzung

### Streaming (POST /api/code)

```bash
curl -X POST http://localhost:3000/api/code \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "explain",
    "code": "const add = (a, b) => a + b;",
    "language": "typescript"
  }'
```

### Non-Streaming (PUT /api/code)

```bash
curl -X PUT http://localhost:3000/api/code \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "generate",
    "prompt": "Eine async Funktion, die eine URL fetcht",
    "language": "typescript"
  }'
```

### Modelle abfragen (GET /api/models)

```bash
curl http://localhost:3000/api/models
```

## Programmatische Nutzung

```typescript
import { CodeAssistantService } from './src/lib/code-assistant';

const service = new CodeAssistantService({
  model: 'qwen2.5-coder:14b-instruct',
});

// Synchron
const response = await service.execute({
  operation: 'explain',
  code: 'const x = [1,2,3].map(n => n * 2);',
  language: 'typescript',
});
console.log(response.result);

// Streaming
for await (const chunk of service.stream({
  operation: 'generate',
  prompt: 'Eine Funktion zum Sortieren',
  language: 'python',
})) {
  process.stdout.write(chunk);
}
```

## IDE-Integration

### VS Code mit Continue

```bash
# Config kopieren
cp ide-configs/continue-config.json ~/.continue/config.json
```

### Neovim mit avante.nvim

```lua
-- In init.lua
require('avante').setup({
  provider = 'ollama',
  ollama = {
    model = 'qwen2.5-coder:14b-instruct',
    endpoint = 'http://localhost:11434',
  },
})
```

### JetBrains IDEs

Siehe `ide-configs/jetbrains-ai-settings.md` für detaillierte Anleitung.

## Projektstruktur

```
code-assistant/
├── src/
│   ├── lib/code-assistant/
│   │   ├── types.ts        # TypeScript-Typen
│   │   ├── prompts.ts      # Prompt-Templates
│   │   ├── service.ts      # CodeAssistantService
│   │   └── index.ts        # Exports
│   ├── app/
│   │   ├── api/
│   │   │   ├── code/route.ts    # Code API
│   │   │   └── models/route.ts  # Models API
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── CodeAssistant.tsx   # Hauptkomponente
│   │   ├── CodeEditor.tsx      # Code-Editor
│   │   └── ResultPanel.tsx     # Ergebnis-Anzeige
│   ├── hooks/
│   │   └── useCodeAssistant.ts # React Hook
│   └── cli.ts              # CLI-Tool
├── ide-configs/
│   ├── continue-config.json    # VS Code Continue
│   ├── neovim-avante.lua      # Neovim Avante
│   ├── vscode-settings.json   # VS Code Settings
│   └── jetbrains-ai-settings.md
├── package.json
└── tsconfig.json
```

## Unterstützte Sprachen

| Sprache | Test-Framework | Dokumentation |
|---------|---------------|---------------|
| TypeScript | Jest/Vitest | TSDoc |
| JavaScript | Jest/Vitest | JSDoc |
| Python | pytest | Google Docstrings |
| Rust | #[test] | rustdoc |
| Go | testing | GoDoc |
| Java | JUnit 5 | Javadoc |
| C# | xUnit/NUnit | XML Docs |
| C++ | Google Test | Doxygen |
| Shell | bats-core | Comments |
| SQL | pgTAP | Comments |

## Empfohlene Modelle

| RAM | Modell | Kontext |
|-----|--------|---------|
| 32GB+ | qwen2.5-coder:32b-instruct | 32K tokens |
| 16GB | qwen2.5-coder:14b-instruct | 32K tokens |
| 16GB | deepseek-coder-v2:16b | 16K tokens |
| 8GB | qwen2.5-coder:7b-instruct | 32K tokens |

## Umgebungsvariablen

| Variable | Beschreibung | Default |
|----------|--------------|---------|
| `OLLAMA_HOST` | Ollama Server URL | `http://localhost:11434` |
| `CODE_MODEL` | Standard-Modell | `qwen2.5-coder:14b-instruct` |

## Troubleshooting

### Ollama nicht erreichbar

```bash
# Server starten
ollama serve

# Status prüfen
curl http://localhost:11434/api/tags
```

### Langsame Generierung

```bash
# GPU-Nutzung prüfen (NVIDIA)
nvidia-smi

# Kleineres Modell verwenden
export CODE_MODEL=qwen2.5-coder:7b-instruct
```

### Modell nicht installiert

```bash
# Verfügbare Modelle
ollama list

# Modell installieren
ollama pull qwen2.5-coder:14b-instruct
```
