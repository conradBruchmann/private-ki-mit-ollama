# Dev-Workflow Integration mit lokalen LLMs

CI/CD-Pipelines, Git-Hooks und IDE-Integration mit Ollama - Kapitel 13.

## Features

- **GitHub Actions**: KI-gestützte Code-Reviews und PR-Zusammenfassungen
- **GitLab CI**: Automatische Reviews in Merge Requests
- **Husky Hooks**: Pre-Commit und Commit-Message Validierung
- **Skripte**: Wiederverwendbare Review- und Check-Logik

## Struktur

```
dev-workflows/
├── .github/
│   └── workflows/
│       ├── ai-code-review.yml     # PR Code-Review
│       └── ai-pr-summary.yml      # PR Zusammenfassung
├── .gitlab-ci.yml                 # GitLab Pipeline
├── .husky/
│   ├── pre-commit                 # Pre-Commit Hook
│   └── commit-msg                 # Commit-Message Hook
├── scripts/
│   ├── ai-review.ts               # Code-Review Logik
│   ├── ai-commit-msg.ts           # Commit-Message Generator
│   └── ai-pre-commit.ts           # Quick Pre-Commit Check
├── package.json
└── README.md
```

## Setup

### 1. Dependencies installieren

```bash
npm install
```

### 2. Husky aktivieren

```bash
npm run prepare
```

### 3. Ollama starten

```bash
ollama serve
ollama pull llama3.2
ollama pull qwen2.5-coder:14b  # Für Code-Reviews
```

## Verwendung

### Git Hooks

Die Hooks werden automatisch bei `git commit` ausgeführt:

```bash
# Pre-Commit: Lint + optional KI-Check
git add .
git commit -m "feat: add feature"

# Mit KI-Review für große Änderungen
OLLAMA_AI_REVIEW=1 git commit -m "feat: big change"

# Mit KI Commit-Message Verbesserung
OLLAMA_AI_COMMIT=1 git commit -m "fixed stuff"
```

### Manueller Review

```bash
# Diff reviewen
git diff | npm run ai:review

# Mit Output-File
npm run ai:review -- --diff changes.patch --output review.json
```

### Commit-Message generieren

```bash
# Staged Changes analysieren und Message generieren
git add .
npm run ai:commit-msg
# Ausgabe: feat(auth): add password validation
```

## GitHub Actions

### Voraussetzungen

1. **Self-hosted Runner** mit Ollama installiert
2. Runner muss `ollama serve` im Hintergrund laufen haben

### Aktivierung

Die Workflows werden automatisch bei Pull Requests ausgeführt:

- `ai-code-review.yml`: Bei PRs mit >50 Zeilen oder Label `ai-review`
- `ai-pr-summary.yml`: Bei allen neuen PRs

### Konfiguration

```yaml
# In Repository Settings > Secrets
OLLAMA_MODEL: qwen2.5-coder:14b  # Optional
```

## GitLab CI

### Voraussetzungen

1. **GitLab Runner** mit Tag `ollama`
2. Ollama auf dem Runner installiert

### Aktivierung

```bash
# AI-Review manuell starten in MR-Pipeline
# (Ist standardmäßig auf "manual" gesetzt)
```

### Variablen

```yaml
# In CI/CD > Variables
GITLAB_API_TOKEN: <token-für-kommentare>
OLLAMA_URL: http://localhost:11434
OLLAMA_MODEL: qwen2.5-coder:14b
```

## Konfiguration

### Umgebungsvariablen

| Variable | Beschreibung | Default |
|----------|--------------|---------|
| `OLLAMA_URL` | Ollama Server | `http://localhost:11434` |
| `OLLAMA_MODEL` | Modell für Reviews | `qwen2.5-coder:14b` |
| `OLLAMA_AI_REVIEW` | KI-Review in Hooks | `0` |
| `OLLAMA_AI_COMMIT` | KI Commit-Messages | `0` |
| `SKIP_AI_CHECK` | Checks überspringen | `0` |

### Lint-Staged

In `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "npm run ai:pre-commit --"
    ]
  }
}
```

## Beispiel: Review-Output

```json
{
  "model": "qwen2.5-coder:14b",
  "filesReviewed": 3,
  "timestamp": "2024-01-15T10:30:00Z",
  "summary": "Fügt User-Validierung hinzu mit E-Mail und Passwort-Checks",
  "issues": [
    {
      "severity": "warning",
      "file": "src/auth.ts",
      "line": 42,
      "message": "Passwort-Regex ist zu einfach",
      "suggestion": "Mindestens 8 Zeichen, Groß/Klein, Zahl, Sonderzeichen"
    }
  ],
  "suggestions": [
    "Unit-Tests für Edge-Cases hinzufügen"
  ],
  "score": 78
}
```

## IDE-Integration

### VS Code

1. **Continue Extension** installieren
2. Ollama als Provider konfigurieren
3. Pre-Commit Hook arbeitet automatisch

### JetBrains

1. **AI Assistant** oder **Ollama Plugin**
2. Git-Integration nutzt die Hooks automatisch

## Troubleshooting

### Hook schlägt fehl

```bash
# Hooks temporär überspringen
git commit --no-verify -m "emergency fix"

# Oder KI-Check deaktivieren
SKIP_AI_CHECK=1 git commit -m "fix"
```

### Ollama nicht erreichbar

```bash
# Status prüfen
curl http://localhost:11434/api/tags

# Ollama starten
ollama serve
```

### Review zu langsam

- Kleineres Modell verwenden: `OLLAMA_MODEL=llama3.2`
- Diff begrenzen (wird automatisch auf 10KB gekürzt)
