//! Demo: Einfacher Chat mit Ollama
//!
//! Zeigt die grundlegende Verwendung des Clients für Chat-Anfragen.

use anyhow::Result;
use ollama_rust_client::{ChatOptions, Message, OllamaClient};

#[tokio::main]
async fn main() -> Result<()> {
    println!("=== Chat Demo ===\n");

    // Einfacher Chat
    simple_chat().await?;

    // Chat mit History
    chat_with_history().await?;

    // Chat mit Optionen
    chat_with_options().await?;

    Ok(())
}

async fn simple_chat() -> Result<()> {
    println!("--- Einfacher Chat ---\n");

    let client = OllamaClient::new("llama3.2");

    let messages = vec![Message::user(
        "Was ist Docker? Erkläre es in einem Satz.",
    )];

    let response = client.chat_once(messages).await?;
    println!("Antwort: {}\n", response);

    Ok(())
}

async fn chat_with_history() -> Result<()> {
    println!("--- Chat mit History ---\n");

    let mut client = OllamaClient::new("llama3.2");
    client.set_system_prompt("Du bist ein Experte für Container-Technologien.");

    // Erste Frage
    println!("User: Was ist Kubernetes?");
    let answer1 = client.chat("Was ist Kubernetes? Kurz bitte.").await?;
    println!("Assistant: {}\n", answer1);

    // Folgefrage (nutzt History)
    println!("User: Wie unterscheidet es sich von Docker Swarm?");
    let answer2 = client
        .chat("Wie unterscheidet es sich von Docker Swarm? Kurz bitte.")
        .await?;
    println!("Assistant: {}\n", answer2);

    // History anzeigen
    println!("--- Chat History ({} Nachrichten) ---", client.get_history().len());
    for msg in client.get_history() {
        let content = if msg.content.len() > 50 {
            format!("{}...", &msg.content[..50])
        } else {
            msg.content.clone()
        };
        println!("[{}]: {}", msg.role, content);
    }
    println!();

    Ok(())
}

async fn chat_with_options() -> Result<()> {
    println!("--- Chat mit Optionen ---\n");

    let mut client = OllamaClient::new("llama3.2");

    // Kreative Antwort (hohe Temperatur)
    println!("Kreative Antwort (temperature=1.5):");
    let options = ChatOptions {
        temperature: Some(1.5),
        num_predict: Some(50),
        ..Default::default()
    };
    let creative = client
        .chat_with_options("Erfinde einen Namen für ein KI-Startup.", options)
        .await?;
    println!("{}\n", creative);

    // Neue Instanz für deterministische Antwort
    let mut client2 = OllamaClient::new("llama3.2");

    // Deterministische Antwort
    println!("Deterministische Antwort (temperature=0.1, seed=42):");
    let options = ChatOptions {
        temperature: Some(0.1),
        seed: Some(42),
        ..Default::default()
    };
    let deterministic = client2
        .chat_with_options("Was ist 2+2?", options)
        .await?;
    println!("{}\n", deterministic);

    Ok(())
}
