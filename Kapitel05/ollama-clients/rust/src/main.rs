//! Ollama Rust Client - Haupteinstiegspunkt
//!
//! Beispiel aus Kapitel 5: API-Zugriff und Integration

use anyhow::Result;
use futures::StreamExt;
use ollama_rust_client::OllamaClient;

#[tokio::main]
async fn main() -> Result<()> {
    println!("=== Ollama Rust Client ===\n");

    let client = OllamaClient::new("llama3.2");

    // Health-Check
    if !client.is_healthy().await {
        eprintln!("Ollama ist nicht erreichbar!");
        eprintln!("Starten Sie Ollama mit: ollama serve");
        return Ok(());
    }

    println!("Ollama ist erreichbar.\n");

    // Einfacher Chat
    println!("=== Einfacher Chat ===");
    let mut chat_client = OllamaClient::new("llama3.2");
    chat_client.set_system_prompt(
        "Du bist ein hilfreicher Assistent. Antworte kurz und präzise auf Deutsch.",
    );

    println!("Frage: Was ist Rust?");
    print!("Antwort: ");

    // Streaming
    let mut stream = chat_client
        .stream_chat("Was ist Rust? (Maximal 2 Sätze)")
        .await?;

    while let Some(result) = stream.next().await {
        match result {
            Ok(content) => print!("{}", content),
            Err(e) => eprintln!("\nFehler: {}", e),
        }
    }

    println!("\n\n=== Demo abgeschlossen ===");
    println!("Führen Sie weitere Demos aus:");
    println!("  cargo run --bin chat-demo");
    println!("  cargo run --bin streaming-demo");
    println!("  cargo run --bin embeddings-demo");

    Ok(())
}
