#!/usr/bin/env python3
"""
Demo: Streaming mit Ollama

Zeigt die Streaming-API für Echtzeit-Ausgabe.
"""

import ollama
import time


def streaming_chat():
    """Chat mit Streaming-Output."""
    print("=== Streaming Chat Demo ===\n")
    print("Frage: Erkläre den Unterschied zwischen let und const in JavaScript.\n")
    print("Antwort (gestreamt):")

    stream = ollama.chat(
        model="llama3.2",
        messages=[{
            "role": "user",
            "content": "Erkläre den Unterschied zwischen let und const in JavaScript. Maximal 3 Sätze."
        }],
        stream=True
    )

    token_count = 0
    start_time = time.time()

    for chunk in stream:
        content = chunk["message"]["content"]
        print(content, end="", flush=True)
        token_count += 1

    duration = time.time() - start_time
    print(f"\n\nStatistiken:")
    print(f"  - Chunks empfangen: {token_count}")
    print(f"  - Dauer: {duration:.2f}s")
    print(f"  - Geschwindigkeit: ~{token_count / duration:.1f} chunks/s")


def streaming_generate():
    """Generate mit Streaming-Output."""
    print("\n=== Streaming Generate Demo ===\n")
    print("Prompt: Die wichtigsten Programmiersprachen für 2025 sind:\n")

    stream = ollama.generate(
        model="llama3.2",
        prompt="Die wichtigsten Programmiersprachen für 2025 sind:",
        stream=True,
        options={"num_predict": 100}
    )

    for chunk in stream:
        print(chunk["response"], end="", flush=True)

    print("\n")


def streaming_with_timeout():
    """Streaming mit Timeout."""
    print("=== Streaming mit Timeout Demo ===\n")
    print("Stoppe nach 5 Sekunden...\n")

    stream = ollama.chat(
        model="llama3.2",
        messages=[{
            "role": "user",
            "content": "Schreibe eine lange Geschichte über einen Programmierer."
        }],
        stream=True
    )

    start_time = time.time()
    timeout = 5.0

    try:
        for chunk in stream:
            if time.time() - start_time > timeout:
                print("\n\n[Abgebrochen nach 5 Sekunden]")
                break
            print(chunk["message"]["content"], end="", flush=True)
    except KeyboardInterrupt:
        print("\n\n[Manuell abgebrochen]")


def main():
    streaming_chat()
    streaming_generate()
    streaming_with_timeout()


if __name__ == "__main__":
    main()
