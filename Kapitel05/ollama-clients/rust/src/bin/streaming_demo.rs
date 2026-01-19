//! Demo: Streaming mit Ollama
//!
//! Zeigt die Streaming-API für Echtzeit-Ausgabe.

use anyhow::Result;
use futures::StreamExt;
use ollama_rust_client::OllamaClient;
use std::io::{self, Write};
use std::time::Instant;

#[tokio::main]
async fn main() -> Result<()> {
    println!("=== Streaming Demo ===\n");

    // Streaming Chat
    streaming_chat().await?;

    // Streaming mit Statistiken
    streaming_with_stats().await?;

    // Streaming mit Timeout
    streaming_with_timeout().await?;

    Ok(())
}

async fn streaming_chat() -> Result<()> {
    println!("--- Streaming Chat ---\n");
    println!("Frage: Erkläre den Unterschied zwischen let und const in JavaScript.\n");
    print!("Antwort: ");
    io::stdout().flush()?;

    let mut client = OllamaClient::new("llama3.2");
    let mut stream = client
        .stream_chat("Erkläre den Unterschied zwischen let und const in JavaScript. Maximal 3 Sätze.")
        .await?;

    while let Some(result) = stream.next().await {
        match result {
            Ok(content) => {
                print!("{}", content);
                io::stdout().flush()?;
            }
            Err(e) => eprintln!("\nFehler: {}", e),
        }
    }

    println!("\n");
    Ok(())
}

async fn streaming_with_stats() -> Result<()> {
    println!("--- Streaming mit Statistiken ---\n");
    println!("Frage: Was sind die SOLID-Prinzipien?\n");
    print!("Antwort: ");
    io::stdout().flush()?;

    let mut client = OllamaClient::new("llama3.2");

    let start = Instant::now();
    let mut chunk_count = 0;

    let mut stream = client
        .stream_chat("Nenne die 5 SOLID-Prinzipien. Nur die Namen, eine Zeile pro Prinzip.")
        .await?;

    while let Some(result) = stream.next().await {
        match result {
            Ok(content) => {
                print!("{}", content);
                io::stdout().flush()?;
                chunk_count += 1;
            }
            Err(e) => eprintln!("\nFehler: {}", e),
        }
    }

    let duration = start.elapsed();
    println!("\n\nStatistiken:");
    println!("  - Chunks empfangen: {}", chunk_count);
    println!("  - Dauer: {:.2}s", duration.as_secs_f64());
    println!(
        "  - Geschwindigkeit: ~{:.1} chunks/s",
        chunk_count as f64 / duration.as_secs_f64()
    );
    println!();

    Ok(())
}

async fn streaming_with_timeout() -> Result<()> {
    println!("--- Streaming mit Timeout ---\n");
    println!("Stoppe nach 3 Sekunden...\n");
    print!("Antwort: ");
    io::stdout().flush()?;

    let mut client = OllamaClient::new("llama3.2");

    let start = Instant::now();
    let timeout = std::time::Duration::from_secs(3);

    let mut stream = client
        .stream_chat("Schreibe eine lange Geschichte über einen Programmierer.")
        .await?;

    while let Some(result) = stream.next().await {
        if start.elapsed() > timeout {
            println!("\n\n[Abgebrochen nach 3 Sekunden]");
            break;
        }

        match result {
            Ok(content) => {
                print!("{}", content);
                io::stdout().flush()?;
            }
            Err(e) => eprintln!("\nFehler: {}", e),
        }
    }

    println!();
    Ok(())
}
