# Ollama API Clients

Beispielcode aus **Kapitel 5: API-Zugriff und Integration**

Dieses Verzeichnis enthält vollständige Client-Implementierungen für die Ollama API in drei Programmiersprachen.

## Voraussetzungen

- Ollama installiert und gestartet (`ollama serve`)
- Mindestens ein Modell installiert (`ollama pull llama3.2`)
- Für Embeddings: `ollama pull nomic-embed-text`

## Clients

### TypeScript

```bash
cd typescript
npm install
npm run dev
```

**Features:**
- Ollama SDK
- OpenAI SDK Kompatibilität
- Streaming
- Embeddings
- Service-Klasse mit History

### Python

```bash
cd python
pip install -r requirements.txt
python main.py
```

**Features:**
- Ollama SDK
- OpenAI SDK Kompatibilität
- Streaming
- Embeddings mit NumPy
- Service-Klasse mit Retry-Logik

### Rust

```bash
cd rust
cargo run
```

**Features:**
- Async/Await mit Tokio
- Streaming mit Futures
- Embeddings
- Kosinus-Ähnlichkeit

## Demos

Jeder Client enthält mehrere Demo-Programme:

| Demo | Beschreibung |
|------|--------------|
| `chat` | Einfacher Chat mit History |
| `streaming` | Echtzeit-Ausgabe mit Streaming |
| `service` | Wiederverwendbare Service-Klasse |
| `openai_compat` | Migration von OpenAI SDK |
| `embeddings` | Semantic Search mit Vektoren |

## Architektur

```
ollama-clients/
├── typescript/           # Node.js/TypeScript
│   ├── src/
│   │   ├── ollama-service.ts
│   │   └── demos/
│   └── package.json
├── python/               # Python 3.11+
│   ├── ollama_service.py
│   ├── demos/
│   └── requirements.txt
└── rust/                 # Rust/Tokio
    ├── src/
    │   ├── lib.rs
    │   └── bin/
    └── Cargo.toml
```

## Weiterführend

- **Kapitel 6**: Chat-UI mit diesen Clients
- **Kapitel 8-10**: RAG mit Embeddings
- **Kapitel 11-13**: Agenten-System
