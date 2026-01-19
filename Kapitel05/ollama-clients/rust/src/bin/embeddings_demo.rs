//! Demo: Embeddings mit Ollama
//!
//! Zeigt die Verwendung von Embeddings für Semantic Search.

use anyhow::Result;
use ollama_rust_client::{cosine_similarity, OllamaClient};
use std::time::Instant;

#[tokio::main]
async fn main() -> Result<()> {
    println!("=== Embeddings Demo ===\n");

    let client = OllamaClient::new("llama3.2");

    // Basic Embeddings
    basic_embeddings(&client).await?;

    // Semantic Similarity
    semantic_similarity(&client).await?;

    // Semantic Search
    semantic_search(&client).await?;

    // Batch Processing
    batch_processing(&client).await?;

    Ok(())
}

async fn basic_embeddings(client: &OllamaClient) -> Result<()> {
    println!("--- Basic Embeddings ---\n");

    let text = "Ollama ermöglicht das lokale Ausführen von LLMs.";

    let embedding = client.embed(text).await?;

    println!("Text: \"{}\"", text);
    println!("Dimension: {}", embedding.len());
    println!(
        "Erste 10 Werte: [{:.4}, {:.4}, {:.4}, {:.4}, {:.4}, {:.4}, {:.4}, {:.4}, {:.4}, {:.4}...]",
        embedding[0],
        embedding[1],
        embedding[2],
        embedding[3],
        embedding[4],
        embedding[5],
        embedding[6],
        embedding[7],
        embedding[8],
        embedding[9]
    );
    println!();

    Ok(())
}

async fn semantic_similarity(client: &OllamaClient) -> Result<()> {
    println!("--- Semantic Similarity ---\n");

    let texts = vec![
        "Der Hund läuft im Park.",
        "Ein Hund rennt durch den Garten.",
        "Die Katze schläft auf dem Sofa.",
        "Python ist eine Programmiersprache.",
        "JavaScript wird für Webentwicklung verwendet.",
    ];

    println!("Texte:");
    for (i, t) in texts.iter().enumerate() {
        println!("  {}. {}", i + 1, t);
    }

    // Embeddings generieren
    let embeddings = client
        .embed_batch(texts.iter().map(|s| s.to_string()).collect())
        .await?;

    // Ähnlichkeitsmatrix
    println!("\nÄhnlichkeitsmatrix:");
    print!("     ");
    for i in 0..texts.len() {
        print!("  {}  ", i + 1);
    }
    println!();

    for i in 0..texts.len() {
        print!("  {}  ", i + 1);
        for j in 0..texts.len() {
            let sim = cosine_similarity(&embeddings[i], &embeddings[j]);
            print!(" {:.2} ", sim);
        }
        println!();
    }

    // Ähnlichste Paare
    println!("\nÄhnlichste Paare (außer identisch):");
    let mut pairs: Vec<(usize, usize, f32)> = Vec::new();

    for i in 0..texts.len() {
        for j in (i + 1)..texts.len() {
            let sim = cosine_similarity(&embeddings[i], &embeddings[j]);
            pairs.push((i, j, sim));
        }
    }

    pairs.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap());

    for (i, j, sim) in pairs.iter().take(3) {
        println!("  {:.3}: \"{}\" <-> \"{}\"", sim, texts[*i], texts[*j]);
    }
    println!();

    Ok(())
}

async fn semantic_search(client: &OllamaClient) -> Result<()> {
    println!("--- Semantic Search ---\n");

    let documents = vec![
        "TypeScript ist eine typisierte Programmiersprache von Microsoft.",
        "React ist eine JavaScript-Bibliothek für Benutzeroberflächen.",
        "Docker ermöglicht die Containerisierung von Anwendungen.",
        "Kubernetes orchestriert Container in Produktionsumgebungen.",
        "PostgreSQL ist eine relationale Datenbank.",
        "MongoDB ist eine NoSQL-Dokumentendatenbank.",
        "Rust ist eine Systemprogrammiersprache mit Speichersicherheit.",
        "Python wird häufig für Machine Learning verwendet.",
    ];

    println!("Dokumente indexiert: {}", documents.len());

    // Dokumente embedden
    let doc_embeddings = client
        .embed_batch(documents.iter().map(|s| s.to_string()).collect())
        .await?;

    // Suchanfrage
    let query = "Welche Datenbanken gibt es?";
    println!("\nSuchanfrage: \"{}\"", query);

    // Query embedden
    let query_embedding = client.embed(query).await?;

    // Ähnlichkeiten berechnen
    let mut results: Vec<(usize, f32)> = documents
        .iter()
        .enumerate()
        .map(|(i, _)| (i, cosine_similarity(&query_embedding, &doc_embeddings[i])))
        .collect();

    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

    // Top 3 Ergebnisse
    println!("\nTop 3 Ergebnisse:");
    for (rank, (idx, score)) in results.iter().take(3).enumerate() {
        println!("  {}. [{:.3}] {}", rank + 1, score, documents[*idx]);
    }
    println!();

    Ok(())
}

async fn batch_processing(client: &OllamaClient) -> Result<()> {
    println!("--- Batch Processing ---\n");

    let texts: Vec<String> = (1..=10)
        .map(|i| format!("Dokument Nummer {} mit Inhalt.", i))
        .collect();

    println!("Verarbeite {} Dokumente im Batch...", texts.len());

    let start = Instant::now();
    let embeddings = client.embed_batch(texts.clone()).await?;
    let duration = start.elapsed();

    println!("Ergebnis:");
    println!("  - Dokumente: {}", embeddings.len());
    println!("  - Dimension: {}", embeddings[0].len());
    println!("  - Dauer: {}ms", duration.as_millis());
    println!(
        "  - Pro Dokument: {:.1}ms",
        duration.as_millis() as f64 / texts.len() as f64
    );
    println!();

    Ok(())
}
