# JetBrains IDE Konfiguration für Ollama

## Kapitel 7: Code-Assistent mit Ollama

Diese Anleitung beschreibt die Konfiguration von JetBrains IDEs (IntelliJ IDEA, WebStorm, PyCharm, etc.) für die Nutzung von Ollama als lokalen Code-Assistenten.

## Option 1: AI Assistant Plugin (Pro)

1. **Settings öffnen**: `Ctrl+Alt+S` (Windows/Linux) oder `Cmd+,` (macOS)
2. **Navigieren zu**: Tools → AI Assistant
3. **Custom Provider konfigurieren**:
   - Provider: `Custom`
   - API URL: `http://localhost:11434/v1`
   - API Key: `ollama` (beliebiger Wert)
   - Model: `qwen2.5-coder:14b-instruct`

## Option 2: CodeGPT Plugin (Kostenlos)

1. **Plugin installieren**:
   - Settings → Plugins → Marketplace
   - Suche: "CodeGPT"
   - Installieren und IDE neu starten

2. **Ollama konfigurieren**:
   - Settings → Tools → CodeGPT
   - Service Provider: `Ollama`
   - Host: `http://localhost:11434`
   - Model: `qwen2.5-coder:14b-instruct`

3. **Chat-Fenster öffnen**:
   - View → Tool Windows → CodeGPT

## Option 3: Continue Plugin

1. **Plugin installieren**:
   - Settings → Plugins → Marketplace
   - Suche: "Continue"
   - Installieren

2. **Config-Datei erstellen**:
   - `~/.continue/config.json` mit Ollama-Konfiguration
   - Siehe `continue-config.json` in diesem Ordner

## Empfohlene Keybindings

```
# .ideavimrc oder IDE Keymap
Alt+Enter     → AI Code Completion
Ctrl+Shift+A  → AI Actions
Alt+C         → CodeGPT Chat
```

## HTTP-Client für Direkte API-Nutzung

JetBrains IDEs haben einen eingebauten HTTP-Client. Erstelle eine `.http` Datei:

```http
### Code erklären
POST http://localhost:11434/api/chat
Content-Type: application/json

{
  "model": "qwen2.5-coder:14b-instruct",
  "messages": [
    {
      "role": "system",
      "content": "Du bist ein Code-Experte. Erkläre Code klar und präzise."
    },
    {
      "role": "user",
      "content": "Erkläre diesen Code:\n\n```typescript\nconst debounce = <T extends (...args: any[]) => void>(\n  fn: T,\n  delay: number\n): T => {\n  let timeoutId: NodeJS.Timeout;\n  return ((...args) => {\n    clearTimeout(timeoutId);\n    timeoutId = setTimeout(() => fn(...args), delay);\n  }) as T;\n};\n```"
    }
  ],
  "stream": false
}

### Code generieren
POST http://localhost:11434/api/chat
Content-Type: application/json

{
  "model": "qwen2.5-coder:14b-instruct",
  "messages": [
    {
      "role": "system",
      "content": "Du bist ein TypeScript-Experte. Schreibe sauberen, typsicheren Code."
    },
    {
      "role": "user",
      "content": "Schreibe eine TypeScript-Funktion, die ein Array von Objekten nach einem Feld gruppiert."
    }
  ],
  "stream": false
}
```

## Live Templates mit KI

Erstelle Live Templates für häufige KI-Anfragen:

**Settings → Editor → Live Templates → Neue Gruppe "AI"**

Template: `aiex`
```
// AI: Explain this code
// $SELECTION$
```

Template: `aitest`
```
// AI: Write tests for this
// $SELECTION$
```

Template: `airef`
```
// AI: Refactor this code
// $SELECTION$
```

## Troubleshooting

### Ollama nicht erreichbar
```bash
# Prüfen ob Ollama läuft
curl http://localhost:11434/api/tags

# Ollama starten
ollama serve
```

### Modell nicht gefunden
```bash
# Verfügbare Modelle
ollama list

# Modell installieren
ollama pull qwen2.5-coder:14b-instruct
```

### Langsame Antworten
- Kleineres Modell verwenden (7b statt 14b/32b)
- GPU-Nutzung prüfen: `nvidia-smi` oder Activity Monitor
- `OLLAMA_NUM_PARALLEL=2` Environment Variable setzen
