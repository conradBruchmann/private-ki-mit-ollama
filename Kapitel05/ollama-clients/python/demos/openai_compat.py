#!/usr/bin/env python3
"""
Demo: OpenAI SDK Kompatibilität

Zeigt, wie das OpenAI SDK mit Ollama verwendet werden kann.
Bestehender OpenAI-Code funktioniert mit minimalen Änderungen.
"""

from openai import OpenAI


# OpenAI Client auf Ollama zeigen
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"  # Wird von Ollama ignoriert
)


def basic_openai_chat():
    """Einfacher Chat mit OpenAI SDK."""
    print("=== OpenAI SDK mit Ollama ===\n")

    completion = client.chat.completions.create(
        model="llama3.2",
        messages=[
            {"role": "system", "content": "Du bist ein hilfreicher Assistent."},
            {"role": "user", "content": "Was ist REST API? Ein Satz."}
        ]
    )

    print("Antwort:", completion.choices[0].message.content)
    print("\nUsage:")
    if completion.usage:
        print(f"  - Prompt Tokens: {completion.usage.prompt_tokens}")
        print(f"  - Completion Tokens: {completion.usage.completion_tokens}")


def streaming_openai():
    """Streaming mit OpenAI SDK."""
    print("\n=== OpenAI Streaming mit Ollama ===\n")

    print("Frage: Was sind die SOLID-Prinzipien?\n")
    print("Antwort: ", end="", flush=True)

    stream = client.chat.completions.create(
        model="llama3.2",
        messages=[{
            "role": "user",
            "content": "Nenne die 5 SOLID-Prinzipien. Nur die Namen, eine Zeile pro Prinzip."
        }],
        stream=True
    )

    for chunk in stream:
        content = chunk.choices[0].delta.content or ""
        print(content, end="", flush=True)

    print("\n")


def function_calling_demo():
    """Function Calling (experimentell)."""
    print("\n=== Function Calling (experimentell) ===\n")

    try:
        response = client.chat.completions.create(
            model="llama3.2",
            messages=[{
                "role": "user",
                "content": "Wie ist das Wetter in Berlin?"
            }],
            tools=[{
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "Ruft das aktuelle Wetter für einen Ort ab",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "Die Stadt, z.B. Berlin"
                            }
                        },
                        "required": ["location"]
                    }
                }
            }]
        )

        message = response.choices[0].message

        if message.tool_calls:
            print("Tool Call erkannt:")
            for call in message.tool_calls:
                print(f"  - Funktion: {call.function.name}")
                print(f"  - Argumente: {call.function.arguments}")
        else:
            print("Keine Tool Calls, normale Antwort:")
            print(message.content)

    except Exception as e:
        print(f"Function Calling nicht unterstützt: {e}")
        print("Verwenden Sie ein Modell wie llama3.1 oder qwen2.5 für Tool-Support.")


def embeddings_demo():
    """Embeddings mit OpenAI SDK."""
    print("\n=== Embeddings mit OpenAI SDK ===\n")

    response = client.embeddings.create(
        model="nomic-embed-text",
        input="Ollama macht lokale KI einfach."
    )

    embedding = response.data[0].embedding
    print(f"Embedding-Dimension: {len(embedding)}")
    print(f"Erste 5 Werte: [{', '.join(f'{v:.4f}' for v in embedding[:5])}...]")


def migration_guide():
    """Migrations-Anleitung ausgeben."""
    print("\n=== Migration von OpenAI zu Ollama ===\n")

    print("Vorher (OpenAI):")
    print('  client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])')
    print("  completion = client.chat.completions.create(")
    print('      model="gpt-4",')
    print("      messages=[...]")
    print("  )")

    print("\nNachher (Ollama):")
    print("  client = OpenAI(")
    print('      base_url="http://localhost:11434/v1",')
    print('      api_key="ollama"')
    print("  )")
    print("  completion = client.chat.completions.create(")
    print('      model="llama3.2",  # <- Nur Modellname ändern')
    print("      messages=[...]")
    print("  )")

    print("\n2 Zeilen Änderung - der Rest bleibt gleich!")


def main():
    basic_openai_chat()
    streaming_openai()
    function_calling_demo()
    embeddings_demo()
    migration_guide()


if __name__ == "__main__":
    main()
