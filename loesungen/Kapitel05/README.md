# Lösungen Kapitel 5: API-Zugriff und Integration

## Übung 1: CLI-Automation

```bash
#!/bin/bash
# analyze-python.sh - Analysiert Python-Dateien in einem Projekt

PROJECT_DIR="${1:-.}"
OUTPUT_FILE="analysis.md"

echo "# Python-Projekt-Analyse" > "$OUTPUT_FILE"
echo "Analysiert: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

for file in $(find "$PROJECT_DIR" -name "*.py" -type f); do
  echo "Analysiere: $file"
  
  # Funktionen extrahieren
  functions=$(grep -E "^def |^async def " "$file" | sed 's/def /- /' | sed 's/(.*/:/')
  
  if [ -n "$functions" ]; then
    echo "## $(basename $file)" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    # Ollama für Zusammenfassung nutzen
    content=$(cat "$file")
    summary=$(curl -s http://localhost:11434/api/generate \
      -d "{
        \"model\": \"llama3.2\",
        \"prompt\": \"Beschreibe kurz (max 3 Sätze), was dieser Python-Code macht:\n\n$content\",
        \"stream\": false
      }" | jq -r '.response')
    
    echo "$summary" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "**Funktionen:**" >> "$OUTPUT_FILE"
    echo "$functions" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
  fi
done

echo "Analyse fertig: $OUTPUT_FILE"
```

---

## Übung 2: TypeScript Chat-Client mit History

```typescript
// chat-client.ts
import Ollama from 'ollama';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class ChatClient {
  private ollama: Ollama;
  private model: string;
  private history: Message[] = [];
  private systemPrompt: string;

  constructor(model: string = 'llama3.2', systemPrompt?: string) {
    this.ollama = new Ollama();
    this.model = model;
    this.systemPrompt = systemPrompt || 'Du bist ein hilfreicher Assistent.';
    
    this.history.push({
      role: 'system',
      content: this.systemPrompt
    });
  }

  async chat(userMessage: string): Promise<string> {
    this.history.push({ role: 'user', content: userMessage });

    const response = await this.ollama.chat({
      model: this.model,
      messages: this.history,
      stream: false
    });

    const assistantMessage = response.message.content;
    this.history.push({ role: 'assistant', content: assistantMessage });

    return assistantMessage;
  }

  clearHistory(): void {
    this.history = [{
      role: 'system',
      content: this.systemPrompt
    }];
  }

  getHistory(): Message[] {
    return [...this.history];
  }
}

// Verwendung
async function main() {
  const client = new ChatClient('llama3.2', 'Du bist ein Python-Experte.');
  
  console.log(await client.chat('Was ist eine List Comprehension?'));
  console.log(await client.chat('Gib mir ein Beispiel dazu.'));
  console.log(await client.chat('Wie war nochmal meine erste Frage?'));
  
  // History prüfen - das Modell sollte sich erinnern
}

main().catch(console.error);
```

---

## Übung 3: Python Embeddings - Ähnliche Dokumente finden

```python
#!/usr/bin/env python3
# find-similar.py
import ollama
import numpy as np
from typing import List, Tuple

def get_embedding(text: str, model: str = "nomic-embed-text") -> List[float]:
    """Generiert Embedding für einen Text."""
    response = ollama.embed(model=model, input=text)
    return response["embeddings"][0]

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Berechnet Kosinus-Ähnlichkeit zwischen zwei Vektoren."""
    a_np = np.array(a)
    b_np = np.array(b)
    return np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np))

def find_similar_pairs(
    documents: List[str], 
    threshold: float = 0.8
) -> List[Tuple[int, int, float]]:
    """Findet ähnliche Dokument-Paare."""
    
    # Embeddings generieren
    print("Generiere Embeddings...")
    embeddings = [get_embedding(doc) for doc in documents]
    
    # Paarweise Ähnlichkeit berechnen
    similar_pairs = []
    for i in range(len(documents)):
        for j in range(i + 1, len(documents)):
            similarity = cosine_similarity(embeddings[i], embeddings[j])
            if similarity >= threshold:
                similar_pairs.append((i, j, similarity))
    
    # Nach Ähnlichkeit sortieren
    similar_pairs.sort(key=lambda x: x[2], reverse=True)
    return similar_pairs

# Beispiel
documents = [
    "Python ist eine interpretierte Programmiersprache.",
    "JavaScript wird hauptsächlich für Webentwicklung verwendet.",
    "Python eignet sich gut für Machine Learning.",
    "TypeScript ist JavaScript mit statischer Typisierung.",
    "Python und Machine Learning passen gut zusammen."
]

pairs = find_similar_pairs(documents, threshold=0.7)

print("\nÄhnliche Dokument-Paare:")
for i, j, sim in pairs:
    print(f"\n[{sim:.2%}]")
    print(f"  Doc {i}: {documents[i][:50]}...")
    print(f"  Doc {j}: {documents[j][:50]}...")
```

---

## Übung 4: Rust Benchmark

```rust
// src/main.rs
use std::time::Instant;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct GenerateRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Deserialize)]
struct GenerateResponse {
    response: String,
    eval_count: Option<u64>,
    eval_duration: Option<u64>,
}

fn benchmark_model(client: &Client, model: &str, prompt: &str) -> Result<f64, Box<dyn std::error::Error>> {
    let request = GenerateRequest {
        model: model.to_string(),
        prompt: prompt.to_string(),
        stream: false,
    };

    let start = Instant::now();
    
    let response: GenerateResponse = client
        .post("http://localhost:11434/api/generate")
        .json(&request)
        .send()?
        .json()?;
    
    let duration = start.elapsed();
    
    // Tokens/Sekunde berechnen
    let tokens_per_sec = if let (Some(count), Some(dur)) = (response.eval_count, response.eval_duration) {
        (count as f64) / (dur as f64 / 1_000_000_000.0)
    } else {
        0.0
    };
    
    println!("{}: {:.2} tokens/s ({:.2}s total)", model, tokens_per_sec, duration.as_secs_f64());
    
    Ok(tokens_per_sec)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let prompt = "Erkläre in 5 Sätzen, was Rust ist.";
    
    let models = vec!["phi3", "llama3.2", "mistral"];
    
    println!("Benchmark: {}\n", prompt);
    println!("{:-<50}", "");
    
    for model in models {
        if let Err(e) = benchmark_model(&client, model, prompt) {
            eprintln!("Fehler bei {}: {}", model, e);
        }
    }
    
    Ok(())
}
```

```toml
# Cargo.toml
[dependencies]
reqwest = { version = "0.11", features = ["blocking", "json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

---

## Übung 5: Circuit Breaker Pattern

```typescript
// circuit-breaker.ts
interface CircuitBreakerConfig {
  failureThreshold: number;  // Anzahl Fehler bis Öffnung
  resetTimeout: number;      // Zeit in ms bis Retry
  windowDuration: number;    // Zeitfenster für Fehler
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = [];
  private lastFailure: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      resetTimeout: config.resetTimeout || 30000,
      windowDuration: config.windowDuration || 60000
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Prüfen ob Circuit offen
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailure > this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN - request rejected');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failures = [];
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailure = now;
    
    // Alte Fehler entfernen
    this.failures = this.failures.filter(
      t => now - t < this.config.windowDuration
    );
    
    if (this.failures.length >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.warn('Circuit breaker OPENED');
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Verwendung mit Ollama
import Ollama from 'ollama';

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
  windowDuration: 60000
});

const ollama = new Ollama();

async function safeGenerate(prompt: string): Promise<string> {
  return breaker.execute(async () => {
    const response = await ollama.generate({
      model: 'llama3.2',
      prompt,
      stream: false
    });
    return response.response;
  });
}
```

---

## Übung 6: Multi-Model-Router

```typescript
// model-router.ts
import Ollama from 'ollama';

type TaskType = 'code' | 'chat' | 'summary' | 'translation' | 'analysis';

interface RouterConfig {
  models: Record<TaskType, string>;
  defaultModel: string;
}

const DEFAULT_CONFIG: RouterConfig = {
  models: {
    code: 'qwen2.5-coder:14b',
    chat: 'llama3.2',
    summary: 'phi3',
    translation: 'llama3.2',
    analysis: 'llama3.2'
  },
  defaultModel: 'llama3.2'
};

class ModelRouter {
  private ollama: Ollama;
  private config: RouterConfig;

  constructor(config: Partial<RouterConfig> = {}) {
    this.ollama = new Ollama();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private detectTaskType(prompt: string): TaskType {
    const lowered = prompt.toLowerCase();
    
    // Code-Erkennung
    if (
      lowered.includes('code') ||
      lowered.includes('function') ||
      lowered.includes('implementier') ||
      lowered.includes('schreib ein script') ||
      lowered.includes('bug') ||
      lowered.includes('debug')
    ) {
      return 'code';
    }
    
    // Zusammenfassung
    if (
      lowered.includes('fasse zusammen') ||
      lowered.includes('zusammenfassung') ||
      lowered.includes('tldr') ||
      lowered.includes('kurz gefasst')
    ) {
      return 'summary';
    }
    
    // Übersetzung
    if (
      lowered.includes('übersetz') ||
      lowered.includes('translate') ||
      lowered.includes('auf englisch') ||
      lowered.includes('auf deutsch')
    ) {
      return 'translation';
    }
    
    // Analyse
    if (
      lowered.includes('analysier') ||
      lowered.includes('erkläre') ||
      lowered.includes('warum') ||
      lowered.includes('vergleich')
    ) {
      return 'analysis';
    }
    
    return 'chat';
  }

  async route(prompt: string): Promise<{ response: string; model: string; taskType: TaskType }> {
    const taskType = this.detectTaskType(prompt);
    const model = this.config.models[taskType] || this.config.defaultModel;
    
    console.log(`[Router] Task: ${taskType} -> Model: ${model}`);
    
    const response = await this.ollama.generate({
      model,
      prompt,
      stream: false
    });
    
    return {
      response: response.response,
      model,
      taskType
    };
  }
}

// Verwendung
async function main() {
  const router = new ModelRouter();
  
  const prompts = [
    'Schreib eine Python-Funktion zum Sortieren einer Liste',
    'Was ist das Wetter heute?',
    'Fasse diesen Artikel zusammen: ...',
    'Übersetze auf Englisch: Guten Tag',
    'Erkläre mir, warum der Himmel blau ist'
  ];
  
  for (const prompt of prompts) {
    console.log(`\nPrompt: ${prompt}`);
    const result = await router.route(prompt);
    console.log(`Response (${result.model}): ${result.response.slice(0, 100)}...`);
  }
}

main().catch(console.error);
```
