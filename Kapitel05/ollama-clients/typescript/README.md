# Ollama TypeScript Client

Beispielcode aus Kapitel 5: API-Zugriff und Integration

## Voraussetzungen

- Node.js 20+
- Ollama läuft (`ollama serve`)
- Mindestens ein Modell installiert (`ollama pull llama3.2`)

## Installation

```bash
npm install
```

## Ausführen

```bash
# Hauptdemo
npm run dev

# Einzelne Demos
npm run demo:chat       # Einfacher Chat
npm run demo:stream     # Streaming-Beispiel
npm run demo:service    # OllamaService-Klasse
npm run demo:openai     # OpenAI SDK Kompatibilität
npm run demo:embeddings # Embeddings & Semantic Search
```

## Projektstruktur

```
typescript/
├── src/
│   ├── index.ts           # Haupteinstiegspunkt
│   ├── ollama-service.ts  # Wiederverwendbare Service-Klasse
│   └── demos/
│       ├── chat.ts        # Chat-Beispiele
│       ├── streaming.ts   # Streaming-Beispiele
│       ├── service-demo.ts# Service-Klasse Demo
│       ├── openai-compat.ts# OpenAI SDK Demo
│       └── embeddings.ts  # Embeddings Demo
├── package.json
└── tsconfig.json
```

## Verwendung in eigenen Projekten

```typescript
import { OllamaService } from './ollama-service';

const service = new OllamaService('llama3.2');
service.setSystemPrompt('Du bist ein hilfreicher Assistent.');

// Einfacher Chat
const response = await service.chat('Hallo!');

// Streaming
for await (const token of service.streamChat('Erkläre TypeScript.')) {
  process.stdout.write(token);
}

// Embeddings
const embedding = await service.embed('Ein Text zum Embedden.');
```
