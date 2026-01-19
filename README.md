# Private KI mit Ollama - Beispielprogramme

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Book: Available](https://img.shields.io/badge/Buch-Erhältlich-green.svg)](https://www.bod.de)

Begleitcode zum Fachbuch **"Private KI mit Ollama – Lokale LLMs für Enterprise-Entwickler"**

von Conrad Bruchmann / BRUCHMANN [TEC] INNOVATION GMBH

---

## 📚 Über das Buch

Dieses Repository enthält alle Codebeispiele und Übungslösungen aus dem Buch. Das Buch zeigt, wie Sie lokale Large Language Models (LLMs) mit Ollama in Ihre Enterprise-Anwendungen integrieren – DSGVO-konform, kosteneffizient und unter Ihrer vollen Kontrolle.

**ISBN:** (wird nach BoD-Freigabe ergänzt)  
**Verlag:** BoD – Books on Demand  
**Erscheinungsjahr:** 2026

---

## 🗂️ Repository-Struktur

```
├── Kapitel03/            # Installation & Grundkonfiguration
│   └── setup-tools/      # Automatisierte Setup-Scripts
│
├── Kapitel04/            # Modelle verstehen und auswählen
│   └── model-selector/   # Modellauswahl-Utilities
│
├── Kapitel05/            # API-Zugriff und Integration
│   └── ollama-clients/   # TypeScript, Python, Rust Clients
│
├── Kapitel06/            # Einfache Chat-UI
│   └── chat-ui/          # Next.js Chat-Anwendung
│
├── Kapitel07/            # Code-Assistent mit Ollama
│   └── code-assistant/   # IDE-Integration & Codegen
│
├── Kapitel08/            # Grundlagen von RAG
│   └── minimal-rag/      # Minimales RAG-Beispiel
│
├── Kapitel09/            # Dokumenten-Pipeline mit Ollama
│   └── rag-pipeline/     # Produktionsreife RAG-Pipeline
│
├── Kapitel10/            # RAG-Frontend & Zugriffskontrolle
│   └── rag-frontend/     # Vollständige RAG-Anwendung
│
├── Kapitel11/            # Vom Chatbot zum Agent: Grundkonzepte
│   └── agent-basics/     # Agent-Grundlagen & Patterns
│
├── Kapitel12/            # Agent-Implementierung mit Ollama
│   └── coding-agent/     # Coding-Agent mit Tool-Use
│
├── Kapitel13/            # Tools und Orchestrierung
│   └── tools-agents/     # Tool-Use & Orchestrierung
│
├── Kapitel14/            # Tools & Agenten auf Ollama-Basis
│   └── ollama-agents/    # Ollama-spezifische Agent-Patterns
│
├── Kapitel15/            # Integration in Dev-Workflows
│   └── dev-workflows/    # GitHub Actions, GitLab CI
│
├── Kapitel16/            # Betrieb & Skalierung
│   └── ops/              # Prometheus, Grafana, Systemd
│
├── Kapitel17/            # Security, Datenschutz, Governance
│   └── security-configs/ # Firewall, K8s Security
│
├── Kapitel18/            # Kostenmodelle & Cloud-Vergleich
│   └── tco-calculator/   # ROI-Rechner
│
├── Kapitel19/            # Zukunft lokaler KI-Stacks
│   └── future-demos/     # Experimentelle Beispiele
│
└── loesungen/            # Übungslösungen
    ├── Kapitel03/
    ├── Kapitel04/
    └── ...
```

---

## 🚀 Schnellstart

### Voraussetzungen

- [Ollama](https://ollama.ai) installiert und läuft
- Node.js 20+ oder Bun
- Optional: Docker, Python 3.11+, Rust

### Installation

```bash
# Repository klonen
git clone https://github.com/conradBruchmann/private-ki-mit-ollama.git
cd private-ki-mit-ollama

# Beispiel aus Kapitel 6 starten
cd Kapitel06/chat-ui
npm install
npm run dev
```

### Erstes Modell laden

```bash
# Empfohlenes Modell für den Einstieg
ollama pull llama3.2:8b

# Oder für Code-Aufgaben
ollama pull qwen2.5-coder:14b
```

---

## 📖 Kapitel-Übersicht

### Teil I: Grundlagen

| Kapitel | Thema | Beispielcode |
|---------|-------|--------------|
| 1 | Von Cloud-KI zu lokalen LLMs | - (Konzept) |
| 2 | Ollama im Überblick | - (Architektur) |
| 3 | Installation & Grundkonfiguration | `Kapitel03/setup-tools/` |
| 4 | Modelle verstehen und auswählen | `Kapitel04/model-selector/` |
| 5 | API-Zugriff und Integration | `Kapitel05/ollama-clients/` |

### Teil II: Erste Projekte

| Kapitel | Thema | Beispielcode |
|---------|-------|--------------|
| 6 | Einfache Chat-UI | `Kapitel06/chat-ui/` |
| 7 | Code-Assistent mit Ollama | `Kapitel07/code-assistant/` |
| 8 | Grundlagen von RAG | `Kapitel08/minimal-rag/` |
| 9 | Dokumenten-Pipeline mit Ollama | `Kapitel09/rag-pipeline/` |
| 10 | RAG-Frontend & Zugriffskontrolle | `Kapitel10/rag-frontend/` |

### Teil III: Agent-System

| Kapitel | Thema | Beispielcode |
|---------|-------|--------------|
| 11 | Vom Chatbot zum Agent: Grundkonzepte | `Kapitel11/agent-basics/` |
| 12 | Agent-Implementierung mit Ollama | `Kapitel12/coding-agent/` |
| 13 | Tools und Orchestrierung | `Kapitel13/tools-agents/` |
| 14 | Tools & Agenten auf Ollama-Basis | `Kapitel14/ollama-agents/` |
| 15 | Integration in Dev-Workflows | `Kapitel15/dev-workflows/` |

### Teil IV: Enterprise

| Kapitel | Thema | Beispielcode |
|---------|-------|--------------|
| 16 | Betrieb & Skalierung | `Kapitel16/ops/` |
| 17 | Security, Datenschutz, Governance | `Kapitel17/security-configs/` |
| 18 | Kostenmodelle & Cloud-Vergleich | `Kapitel18/tco-calculator/` |
| 19 | Zukunft lokaler KI-Stacks | `Kapitel19/future-demos/` |

---

## 🔧 Technologie-Stack

Die Beispiele verwenden:

- **Runtime:** Node.js / Bun / Python / Rust
- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** TypeScript, Hono, FastAPI
- **Vector DB:** ChromaDB, Qdrant
- **Monitoring:** Prometheus, Grafana, Loki
- **Container:** Docker, Docker Compose
- **CI/CD:** GitHub Actions, GitLab CI

---

## 📝 Lizenz

Der Beispielcode steht unter der **MIT-Lizenz** – Sie dürfen ihn frei in Ihren eigenen Projekten verwenden, auch kommerziell.

```
MIT License

Copyright (c) 2026 BRUCHMANN [TEC] INNOVATION GMBH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

Das Buch selbst ist urheberrechtlich geschützt. Siehe Impressum im Buch.

---

## 🐛 Fehler gefunden?

- **Codebeispiele:** Issue oder Pull Request in diesem Repository
- **Buchinhalt:** E-Mail an [conrad@bruchmann-tec.com](mailto:conrad@bruchmann-tec.com)

---

## 🔗 Links

- **Buch kaufen:** [BoD Buchshop](https://buchshop.bod.de) | [Amazon](https://amazon.de)
- **Ollama:** [ollama.ai](https://ollama.ai)
- **Autor:** [bruchmann-tec.de](https://bruchmann-tec.de)

---

*Viel Erfolg mit lokaler KI!* 🤖
