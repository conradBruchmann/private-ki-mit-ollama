# Ollama Rust Client

Beispielcode aus Kapitel 5: API-Zugriff und Integration

## Voraussetzungen

- Rust 1.75+ (mit Cargo)
- Ollama läuft (`ollama serve`)
- Mindestens ein Modell installiert (`ollama pull llama3.2`)

## Build & Ausführen

```bash
# Build
cargo build --release

# Hauptdemo
cargo run

# Einzelne Demos
cargo run --bin chat-demo        # Chat-Beispiele
cargo run --bin streaming-demo   # Streaming-Beispiel
cargo run --bin embeddings-demo  # Embeddings & Semantic Search
```

## Projektstruktur

```
rust/
├── src/
│   ├── lib.rs              # Bibliothek mit OllamaClient
│   ├── main.rs             # Haupteinstiegspunkt
│   └── bin/
│       ├── chat_demo.rs    # Chat-Beispiele
│       ├── streaming_demo.rs # Streaming-Beispiele
│       └── embeddings_demo.rs # Embeddings Demo
├── Cargo.toml
└── README.md
```

## Verwendung in eigenen Projekten

```rust
use ollama_rust_client::{OllamaClient, Message};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mut client = OllamaClient::new("llama3.2");
    client.set_system_prompt("Du bist ein hilfreicher Assistent.");

    // Einfacher Chat
    let response = client.chat("Hallo!").await?;
    println!("{}", response);

    // Streaming
    use futures::StreamExt;
    let mut stream = client.stream_chat("Erkläre Rust.").await?;
    while let Some(Ok(content)) = stream.next().await {
        print!("{}", content);
    }

    // Embeddings
    let embedding = client.embed("Ein Text zum Embedden.").await?;

    Ok(())
}
```

## API-Übersicht

### OllamaClient

| Methode | Beschreibung |
|---------|--------------|
| `new(model)` | Neuen Client erstellen |
| `set_system_prompt(prompt)` | System-Prompt setzen |
| `chat(message)` | Chat mit History |
| `chat_once(messages)` | Einzelne Chat-Anfrage |
| `stream_chat(message)` | Streaming-Chat |
| `complete(prompt)` | Text-Completion |
| `embed(text)` | Embedding generieren |
| `embed_batch(texts)` | Batch-Embeddings |
| `is_healthy()` | Health-Check |

### Hilfsfunktionen

| Funktion | Beschreibung |
|----------|--------------|
| `cosine_similarity(a, b)` | Kosinus-Ähnlichkeit zwischen Vektoren |
