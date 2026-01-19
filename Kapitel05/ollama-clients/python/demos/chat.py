#!/usr/bin/env python3
"""
Demo: Einfacher Chat mit Ollama SDK

Zeigt die grundlegende Verwendung des Ollama SDK für Chat-Anfragen.
"""

import ollama


def simple_chat():
    """Einfacher Chat ohne History."""
    print("=== Einfacher Chat Demo ===\n")

    response = ollama.chat(
        model="llama3.2",
        messages=[
            {"role": "user", "content": "Was ist Docker? Erkläre es in einem Satz."}
        ]
    )

    print("Antwort:", response["message"]["content"])
    print("\nStatistiken:")
    print(f"  - Modell: {response['model']}")
    print(f"  - Generierte Tokens: {response.get('eval_count', 'N/A')}")
    print(f"  - Dauer: {response.get('total_duration', 0) / 1e9:.2f}s")


def chat_with_history():
    """Chat mit aufgebauter History."""
    print("\n=== Chat mit History Demo ===\n")

    messages = [
        {"role": "system", "content": "Du bist ein Experte für Container-Technologien."},
        {"role": "user", "content": "Was ist Kubernetes?"}
    ]

    # Erste Nachricht
    print("User: Was ist Kubernetes?")
    response = ollama.chat(model="llama3.2", messages=messages)
    print("Assistant:", response["message"]["content"])

    # History erweitern
    messages.append(response["message"])
    messages.append({"role": "user", "content": "Wie unterscheidet es sich von Docker Swarm?"})

    # Zweite Nachricht mit Kontext
    print("\nUser: Wie unterscheidet es sich von Docker Swarm?")
    response = ollama.chat(model="llama3.2", messages=messages)
    print("Assistant:", response["message"]["content"])


def chat_with_options():
    """Chat mit verschiedenen Optionen."""
    print("\n=== Chat mit Options Demo ===\n")

    # Kreativ (hohe Temperatur)
    print("Kreative Antwort (temperature=1.5):")
    creative = ollama.chat(
        model="llama3.2",
        messages=[{"role": "user", "content": "Erfinde einen Namen für ein KI-Startup."}],
        options={
            "temperature": 1.5,
            "num_predict": 50
        }
    )
    print(creative["message"]["content"])

    # Deterministisch (niedrige Temperatur, Seed)
    print("\nDeterministische Antwort (temperature=0.1, seed=42):")
    deterministic = ollama.chat(
        model="llama3.2",
        messages=[{"role": "user", "content": "Was ist 2+2?"}],
        options={
            "temperature": 0.1,
            "seed": 42
        }
    )
    print(deterministic["message"]["content"])


def main():
    simple_chat()
    chat_with_history()
    chat_with_options()


if __name__ == "__main__":
    main()
