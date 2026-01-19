# Ollama Setup Tools

Installation, Diagnose und Benchmark Tools - Beispielcode aus Kapitel 3.

## Features

- **System-Check**: Hardware-Analyse und Ollama-Prüfung
- **Health Check**: Server-Status und API-Verfügbarkeit
- **Benchmark**: Performance-Messung (Tokens/sec)
- **Docker**: Compose-Konfigurationen für verschiedene Setups
- **Shell-Scripts**: Installation und Konfiguration

## Voraussetzungen

- Node.js 18+ (für TypeScript Tools)
- Ollama installiert (für Tests)
- Docker (für Container-Setups)

## Installation

```bash
npm install
```

## Shell-Scripts

```bash
# Installation prüfen
./scripts/check-installation.sh

# Ollama installieren
./scripts/install-ollama.sh

# Benchmark ausführen
./scripts/benchmark.sh [model]
./scripts/benchmark.sh llama3.2

# Netzwerk konfigurieren
./scripts/configure-network.sh status
./scripts/configure-network.sh enable
./scripts/configure-network.sh disable
```

## TypeScript CLI

```bash
# Vollständiger System-Check
npm run check
# oder: npx tsx src/cli.ts check

# System-Informationen
npm run info
# oder: npx tsx src/cli.ts info

# Health Check
npm run health
# oder: npx tsx src/cli.ts health

# Benchmark
npm run benchmark
npx tsx src/cli.ts benchmark llama3.2

# Modell-Vergleich
npx tsx src/cli.ts compare phi3 llama3.2 mistral

# Installierte Modelle
npx tsx src/cli.ts models

# Laufende Modelle
npx tsx src/cli.ts running
```

## Docker-Setups

```bash
# Basis (CPU only)
docker compose -f docker/docker-compose.yml up -d

# Mit NVIDIA GPU
docker compose -f docker/docker-compose.gpu.yml up -d

# Vollständig (Ollama + Open WebUI)
docker compose -f docker/docker-compose.full.yml up -d

# Custom Image bauen (mit vorinstallierten Modellen)
docker build -f docker/Dockerfile.custom -t ollama-custom docker/
```

## Projektstruktur

```
setup-tools/
├── scripts/
│   ├── check-installation.sh  # Installations-Check
│   ├── install-ollama.sh      # Installer
│   ├── benchmark.sh           # Shell Benchmark
│   └── configure-network.sh   # Netzwerk-Konfiguration
├── docker/
│   ├── docker-compose.yml     # Basis (CPU)
│   ├── docker-compose.gpu.yml # Mit NVIDIA GPU
│   ├── docker-compose.full.yml # Ollama + WebUI
│   └── Dockerfile.custom      # Custom Image
├── src/
│   ├── system-info.ts         # System-Analyse
│   ├── health-check.ts        # Health Checks
│   ├── benchmark.ts           # Performance-Tests
│   ├── cli.ts                 # CLI Tool
│   └── index.ts               # Exports
├── package.json
└── tsconfig.json
```

## Benchmark-Metriken

| Metrik | Beschreibung |
|--------|--------------|
| **Token-Generierung** | Tokens pro Sekunde bei der Ausgabe |
| **Prompt-Verarbeitung** | Tokens pro Sekunde beim Einlesen |
| **First-Token-Latenz** | Zeit bis zum ersten Token (ms) |

### Richtwerte

| Speed | Bewertung |
|-------|-----------|
| > 50 t/s | Exzellent (GPU-beschleunigt) |
| 20-50 t/s | Gut (flüssige Interaktion) |
| 10-20 t/s | Akzeptabel (Batch-Verarbeitung) |
| < 10 t/s | Langsam (GPU prüfen) |

## Programmatische Nutzung

```typescript
import {
  getSystemInfo,
  runHealthChecks,
  runBenchmark,
  getModelRecommendations,
} from "./src/index.js";

// System-Info
const info = await getSystemInfo();
console.log(info.memory.total, "GB RAM");
console.log(info.gpu?.name || "Keine GPU");

// Health Check
const health = await runHealthChecks();
if (!health.healthy) {
  console.log("Probleme:", health.checks.filter(c => c.status !== "pass"));
}

// Benchmark
const result = await runBenchmark({ model: "llama3.2", testRuns: 3 });
console.log(`${result.generateSpeed} tokens/sec`);

// Empfehlungen
const models = getModelRecommendations(info);
console.log("Empfohlene Modelle:", models);
```

## Umgebungsvariablen

| Variable | Beschreibung | Default |
|----------|--------------|---------|
| `OLLAMA_HOST` | Ollama Server URL | `http://localhost:11434` |

## Troubleshooting

### Server nicht erreichbar
```bash
# Prüfen ob Ollama läuft
curl http://localhost:11434/api/tags

# Ollama starten
ollama serve
```

### Langsame Performance
```bash
# GPU-Nutzung prüfen (NVIDIA)
nvidia-smi

# Modell-RAM prüfen
ollama ps

# Kleineres Modell verwenden
ollama pull phi3
```

### Docker GPU nicht erkannt
```bash
# NVIDIA Container Toolkit prüfen
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```
