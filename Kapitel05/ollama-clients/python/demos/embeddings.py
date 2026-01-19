#!/usr/bin/env python3
"""
Demo: Embeddings mit Ollama

Zeigt die Verwendung von Embeddings für Semantic Search.
"""

import ollama
import numpy as np
from typing import List


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Kosinus-Ähnlichkeit zwischen zwei Vektoren berechnen."""
    a_np = np.array(a)
    b_np = np.array(b)
    return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))


def basic_embeddings():
    """Grundlegende Embedding-Generierung."""
    print("=== Basic Embeddings Demo ===\n")

    text = "Ollama ermöglicht das lokale Ausführen von LLMs."

    response = ollama.embed(
        model="nomic-embed-text",
        input=text
    )

    embedding = response["embeddings"][0]
    print(f'Text: "{text}"')
    print(f"Dimension: {len(embedding)}")
    print(f"Erste 10 Werte: [{', '.join(f'{v:.4f}' for v in embedding[:10])}...]")


def semantic_similarity():
    """Semantische Ähnlichkeit zwischen Texten."""
    print("\n=== Semantic Similarity Demo ===\n")

    texts = [
        "Der Hund läuft im Park.",
        "Ein Hund rennt durch den Garten.",
        "Die Katze schläft auf dem Sofa.",
        "Python ist eine Programmiersprache.",
        "JavaScript wird für Webentwicklung verwendet.",
    ]

    print("Texte:")
    for i, t in enumerate(texts):
        print(f"  {i + 1}. {t}")

    # Embeddings für alle Texte generieren
    response = ollama.embed(
        model="nomic-embed-text",
        input=texts
    )
    embeddings = response["embeddings"]

    # Ähnlichkeitsmatrix berechnen
    print("\nÄhnlichkeitsmatrix:")
    header = "     " + "".join(f"  {i + 1}  " for i in range(len(texts)))
    print(header)

    for i in range(len(texts)):
        row = f"  {i + 1}  "
        for j in range(len(texts)):
            sim = cosine_similarity(embeddings[i], embeddings[j])
            row += f" {sim:.2f} "
        print(row)

    # Ähnlichste Paare finden
    print("\nÄhnlichste Paare (außer identisch):")
    pairs = []

    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            pairs.append({
                "i": i,
                "j": j,
                "sim": cosine_similarity(embeddings[i], embeddings[j])
            })

    pairs.sort(key=lambda x: x["sim"], reverse=True)

    for p in pairs[:3]:
        print(f'  {p["sim"]:.3f}: "{texts[p["i"]]}" <-> "{texts[p["j"]]}"')


def semantic_search():
    """Semantische Suche in Dokumenten."""
    print("\n=== Semantic Search Demo ===\n")

    # Dokumente
    documents = [
        "TypeScript ist eine typisierte Programmiersprache von Microsoft.",
        "React ist eine JavaScript-Bibliothek für Benutzeroberflächen.",
        "Docker ermöglicht die Containerisierung von Anwendungen.",
        "Kubernetes orchestriert Container in Produktionsumgebungen.",
        "PostgreSQL ist eine relationale Datenbank.",
        "MongoDB ist eine NoSQL-Dokumentendatenbank.",
        "Rust ist eine Systemprogrammiersprache mit Speichersicherheit.",
        "Python wird häufig für Machine Learning verwendet.",
    ]

    print(f"Dokumente indexiert: {len(documents)}")

    # Dokumente embedden
    doc_response = ollama.embed(
        model="nomic-embed-text",
        input=documents
    )
    doc_embeddings = doc_response["embeddings"]

    # Suchanfrage
    query = "Welche Datenbanken gibt es?"
    print(f'\nSuchanfrage: "{query}"')

    # Query embedden
    query_response = ollama.embed(
        model="nomic-embed-text",
        input=query
    )
    query_embedding = query_response["embeddings"][0]

    # Ähnlichkeiten berechnen und sortieren
    results = []
    for i, doc in enumerate(documents):
        score = cosine_similarity(query_embedding, doc_embeddings[i])
        results.append({"doc": doc, "score": score})

    results.sort(key=lambda x: x["score"], reverse=True)

    # Top 3 Ergebnisse
    print("\nTop 3 Ergebnisse:")
    for i, r in enumerate(results[:3]):
        print(f"  {i + 1}. [{r['score']:.3f}] {r['doc']}")


def batch_processing():
    """Batch-Verarbeitung mehrerer Dokumente."""
    print("\n=== Batch Processing Demo ===\n")

    texts = [f"Dokument Nummer {i + 1} mit Inhalt." for i in range(10)]

    print(f"Verarbeite {len(texts)} Dokumente im Batch...")

    import time
    start = time.time()

    response = ollama.embed(
        model="nomic-embed-text",
        input=texts
    )

    duration = (time.time() - start) * 1000

    print("Ergebnis:")
    print(f"  - Dokumente: {len(response['embeddings'])}")
    print(f"  - Dimension: {len(response['embeddings'][0])}")
    print(f"  - Dauer: {duration:.0f}ms")
    print(f"  - Pro Dokument: {duration / len(texts):.1f}ms")


def main():
    # Prüfen ob Embedding-Modell verfügbar
    try:
        ollama.show(model="nomic-embed-text")
    except Exception:
        print("Embedding-Modell nicht gefunden.")
        print("Installieren mit: ollama pull nomic-embed-text")
        print("\nFahre trotzdem fort (kann fehlschlagen)...\n")

    basic_embeddings()
    semantic_similarity()
    semantic_search()
    batch_processing()


if __name__ == "__main__":
    main()
