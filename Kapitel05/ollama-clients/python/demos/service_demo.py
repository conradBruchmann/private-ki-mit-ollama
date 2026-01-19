#!/usr/bin/env python3
"""
Demo: OllamaService Klasse

Zeigt die Verwendung der OllamaService-Wrapper-Klasse.
"""

import sys
sys.path.insert(0, "..")

from ollama_service import OllamaService, safe_chat_with_retry, ChatOptions


def basic_service_usage():
    """Grundlegende Verwendung der Service-Klasse."""
    print("=== OllamaService Basic Usage ===\n")

    service = OllamaService("llama3.2")

    # System-Prompt setzen
    service.set_system_prompt(
        "Du bist ein freundlicher Coding-Assistent. Antworte immer auf Deutsch."
    )

    # Erste Frage
    print("User: Was ist eine Closure in JavaScript?")
    answer1 = service.chat("Was ist eine Closure in JavaScript? Kurz bitte.")
    print("Assistant:", answer1)

    # Folgefrage (nutzt History)
    print("\nUser: Zeig mir ein Beispiel.")
    answer2 = service.chat("Zeig mir ein Beispiel.")
    print("Assistant:", answer2)

    # History anzeigen
    print("\n--- Chat History ---")
    for msg in service.get_history():
        content = msg.content[:50] + "..." if len(msg.content) > 50 else msg.content
        print(f"[{msg.role}]: {content}")


def streaming_service_usage():
    """Streaming mit der Service-Klasse."""
    print("\n=== OllamaService Streaming ===\n")

    service = OllamaService("llama3.2")
    service.set_system_prompt("Du bist ein Experte für Python.")

    print("Frage: Was sind List Comprehensions?\n")
    print("Antwort: ", end="", flush=True)

    for token in service.stream_chat("Was sind List Comprehensions? Erkläre kurz."):
        print(token, end="", flush=True)

    print("\n")


def multi_model_usage():
    """Verwendung verschiedener Modelle."""
    print("\n=== Multi-Model Usage ===\n")

    # Modelle auflisten
    models = OllamaService.list_models()
    print("Verfügbare Modelle:", ", ".join(models[:5]))

    if models:
        service = OllamaService(models[0])
        print(f"\nVerwende: {models[0]}")

        response = service.chat("Sage 'Hallo' auf drei Sprachen.")
        print("Antwort:", response)


def error_handling_demo():
    """Fehlerbehandlung demonstrieren."""
    print("\n=== Error Handling Demo ===\n")

    service = OllamaService("llama3.2")

    try:
        # Mit Retry-Logik
        response = safe_chat_with_retry(
            service,
            "Was ist der Sinn des Lebens?",
            max_retries=3
        )
        print("Antwort:", response)
    except Exception as e:
        print(f"Fehler: {e}")


def options_demo():
    """Verschiedene Generierungsoptionen."""
    print("\n=== Options Demo ===\n")

    service = OllamaService("llama3.2")

    # Mit niediger Temperatur für konsistente Antworten
    options = ChatOptions(temperature=0.3, num_predict=100)

    print("Mit temperature=0.3:")
    response = service.chat("Nenne die drei wichtigsten Design Patterns.", options)
    print(response)


def completion_demo():
    """Text-Completion demonstrieren."""
    print("\n=== Text Completion Demo ===\n")

    service = OllamaService("llama3.2")

    prompt = "Die drei wichtigsten Prinzipien beim Programmieren sind:"
    print(f"Prompt: {prompt}")

    options = ChatOptions(num_predict=100)
    completion = service.complete(prompt, options)
    print(f"Completion: {completion}")


def main():
    # Health-Check
    if not OllamaService.is_healthy():
        print("Ollama nicht erreichbar! Starten mit: ollama serve")
        return

    basic_service_usage()
    streaming_service_usage()
    multi_model_usage()
    error_handling_demo()
    options_demo()
    completion_demo()


if __name__ == "__main__":
    main()
