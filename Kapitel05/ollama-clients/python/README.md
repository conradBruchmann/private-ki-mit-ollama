# Ollama Python Client

Beispielcode aus Kapitel 5: API-Zugriff und Integration

## Voraussetzungen

- Python 3.11+
- Ollama läuft (`ollama serve`)
- Mindestens ein Modell installiert (`ollama pull llama3.2`)

## Installation

```bash
pip install -r requirements.txt
```

## Ausführen

```bash
# Hauptdemo
python main.py

# Einzelne Demos
python demos/chat.py          # Einfacher Chat
python demos/streaming.py     # Streaming-Beispiel
python demos/service_demo.py  # OllamaService-Klasse
python demos/openai_compat.py # OpenAI SDK Kompatibilität
python demos/embeddings.py    # Embeddings & Semantic Search
```

## Projektstruktur

```
python/
├── main.py                # Haupteinstiegspunkt
├── ollama_service.py      # Wiederverwendbare Service-Klasse
├── requirements.txt       # Abhängigkeiten
├── demos/
│   ├── chat.py           # Chat-Beispiele
│   ├── streaming.py      # Streaming-Beispiele
│   ├── service_demo.py   # Service-Klasse Demo
│   ├── openai_compat.py  # OpenAI SDK Demo
│   └── embeddings.py     # Embeddings Demo
└── README.md
```

## Verwendung in eigenen Projekten

```python
from ollama_service import OllamaService

service = OllamaService("llama3.2")
service.set_system_prompt("Du bist ein hilfreicher Assistent.")

# Einfacher Chat
response = service.chat("Hallo!")

# Streaming
for token in service.stream_chat("Erkläre Python."):
    print(token, end="", flush=True)

# Embeddings
embedding = service.embed("Ein Text zum Embedden.")
```
