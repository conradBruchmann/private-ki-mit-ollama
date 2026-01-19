#!/usr/bin/env python3
"""
Ollama Python Client - Haupteinstiegspunkt

Dieses Modul demonstriert die grundlegende Verwendung des Ollama SDK.

Verwendung:
    pip install -r requirements.txt
    python main.py

Demos ausführen:
    python demos/chat.py       - Einfacher Chat
    python demos/streaming.py  - Streaming-Beispiel
    python demos/service_demo.py - Service-Klasse Demo
    python demos/openai_compat.py - OpenAI-kompatible API
    python demos/embeddings.py - Embeddings generieren
"""

from ollama_service import OllamaService


def main():
    print("=== Ollama Python Client ===\n")

    # Health-Check
    if not OllamaService.is_healthy():
        print("Ollama ist nicht erreichbar!")
        print("Starten Sie Ollama mit: ollama serve")
        return

    # Verfügbare Modelle anzeigen
    models = OllamaService.list_models()
    print("Verfügbare Modelle:")
    for m in models[:5]:  # Zeige max 5
        print(f"  - {m}")
    if len(models) > 5:
        print(f"  ... und {len(models) - 5} weitere")
    print()

    # Service initialisieren
    model = models[0] if models else "llama3.2"
    service = OllamaService(model)
    print(f"Verwende Modell: {model}\n")

    # System-Prompt setzen
    service.set_system_prompt(
        "Du bist ein hilfreicher Assistent. Antworte kurz und präzise auf Deutsch."
    )

    # Einfache Anfrage mit Streaming
    print("Frage: Was ist Python?")
    print("Antwort: ", end="", flush=True)

    for token in service.stream_chat("Was ist Python? (Maximal 2 Sätze)"):
        print(token, end="", flush=True)

    print("\n\n=== Demo abgeschlossen ===")
    print("Führen Sie weitere Demos im 'demos/' Ordner aus.")


if __name__ == "__main__":
    main()
