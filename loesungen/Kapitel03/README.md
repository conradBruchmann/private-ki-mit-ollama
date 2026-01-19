# Lösungen Kapitel 3: Installation & Grundkonfiguration

## Übung 1: Installation

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows: Installer von ollama.ai herunterladen

# Prüfen
ollama --version
# Erwartete Ausgabe: ollama version 0.x.x
```

---

## Übung 2: Hardware-Check

```bash
ollama run phi3 "Sage Hallo"
```

**Erwartete Ausgabe am Ende:**
```
eval rate: 45.23 tokens/s
```

Die Token/Sekunde hängt von Ihrer Hardware ab:
- M1/M2 Mac: 40-60 tokens/s
- Intel i7 (CPU only): 10-20 tokens/s
- NVIDIA RTX 3080: 80-120 tokens/s

---

## Übung 3: GPU-Test

```bash
# NVIDIA
nvidia-smi

# AMD
rocm-smi

# Während Ollama läuft, zweites Terminal:
watch -n 1 nvidia-smi
```

**Beobachtung:** Bei llama3.2:8b sollten ca. 5-6 GB VRAM belegt sein.

---

## Übung 4: Netzwerk-Setup

```bash
# Ollama für Netzwerkzugriff konfigurieren
export OLLAMA_HOST=0.0.0.0:11434

# Oder in systemd (Linux):
sudo systemctl edit ollama
# [Service]
# Environment="OLLAMA_HOST=0.0.0.0:11434"

# Neustart
sudo systemctl restart ollama

# Test von anderem Rechner
curl http://192.168.1.100:11434/api/tags
```

**Sicherheitshinweis:** Firewall entsprechend konfigurieren!

---

## Übung 5: Docker-Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]

volumes:
  ollama_data:
```

```bash
# Starten
docker compose up -d

# Modell laden
docker exec -it ollama ollama pull phi3

# Container neustarten
docker compose restart

# Prüfen ob Modell noch da
docker exec -it ollama ollama list
# phi3 sollte aufgelistet sein
```

---

## Übung 6: Benchmark-Script

```bash
#!/bin/bash
# benchmark.sh

MODELS=("phi3" "llama3.2" "mistral")
PROMPT="Erkläre in 3 Sätzen, was Machine Learning ist."

echo "Modell,Tokens/s,Gesamtzeit"

for model in "${MODELS[@]}"; do
  echo -n "$model,"
  
  result=$(curl -s http://localhost:11434/api/generate \
    -d "{\"model\": \"$model\", \"prompt\": \"$PROMPT\", \"stream\": false}")
  
  tokens_per_sec=$(echo "$result" | jq '.eval_count / .eval_duration * 1e9')
  total_time=$(echo "$result" | jq '.total_duration / 1e9')
  
  echo "$tokens_per_sec,$total_time"
done
```

```bash
chmod +x benchmark.sh
./benchmark.sh
```

---

## Übung 7: API erkunden

```bash
# 1. Verfügbare Modelle
curl -s http://localhost:11434/api/tags | jq '.models[] | {name, size}'

# 2. Einfache Generierung
curl -s http://localhost:11434/api/generate -d '{
  "model": "phi3",
  "prompt": "Was ist 2+2?",
  "stream": false
}' | jq '{response, eval_count, eval_duration}'

# 3. Chat mit History
curl -s http://localhost:11434/api/chat -d '{
  "model": "phi3",
  "messages": [
    {"role": "user", "content": "Mein Name ist Max"},
    {"role": "assistant", "content": "Hallo Max!"},
    {"role": "user", "content": "Wie heiße ich?"}
  ],
  "stream": false
}' | jq '.message.content'
# Ausgabe: "Du heißt Max."
```

---

## Übung 8: Custom Modelfile

```dockerfile
# sql-expert.modelfile
FROM llama3.2
PARAMETER temperature 0.2
PARAMETER num_ctx 4096
SYSTEM """Du bist ein SQL-Experte. Beantworte Fragen
zu SQL-Syntax, Optimierung und Datenbankdesign.
Gib immer formatierte SQL-Beispiele."""
```

```bash
ollama create sql-expert -f sql-expert.modelfile
ollama run sql-expert "Erkläre INNER vs LEFT JOIN"
```

**Bonus - Übersetzer:**
```dockerfile
# translator.modelfile
FROM llama3.2
PARAMETER temperature 0.3
SYSTEM """Du bist ein professioneller Übersetzer.
Übersetze Text präzise zwischen Deutsch und Englisch.
Antworte NUR mit der Übersetzung, ohne Erklärungen."""
```

---

## Übung 9: Streaming

**Python-Lösung:**
```python
#!/usr/bin/env python3
# streaming.py
import requests
import json

response = requests.post(
    "http://localhost:11434/api/generate",
    json={
        "model": "phi3",
        "prompt": "Zähle langsam von 1 bis 10"
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        data = json.loads(line)
        print(data.get("response", ""), end="", flush=True)
        if data.get("done"):
            print()  # Neue Zeile am Ende
```

**Node.js-Lösung:**
```javascript
// streaming.mjs
const response = await fetch("http://localhost:11434/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "phi3",
    prompt: "Zähle langsam von 1 bis 10"
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const data = JSON.parse(chunk);
  process.stdout.write(data.response || "");
}
console.log();
```

---

## Übung 10: Batch-Verarbeitung

```bash
#!/bin/bash
# batch-summarize.sh

mkdir -p summaries

for file in docs/*.txt; do
  [ -f "$file" ] || continue
  
  echo "Verarbeite: $file"
  
  # Inhalt escapen für JSON
  content=$(cat "$file" | jq -Rs .)
  
  response=$(curl -s http://localhost:11434/api/generate \
    -d "{
      \"model\": \"phi3\",
      \"prompt\": \"Fasse den folgenden Text in 2-3 Sätzen zusammen:\n\n$content\",
      \"stream\": false
    }")
  
  echo "$response" | jq -r '.response' > "summaries/$(basename "$file" .txt)_summary.txt"
done

echo "Fertig! Zusammenfassungen in ./summaries/"
```

```bash
# Vorbereitung
mkdir -p docs
echo "Dies ist ein langer Text über künstliche Intelligenz..." > docs/ai.txt
echo "Python ist eine Programmiersprache..." > docs/python.txt

# Ausführen
chmod +x batch-summarize.sh
./batch-summarize.sh
```
