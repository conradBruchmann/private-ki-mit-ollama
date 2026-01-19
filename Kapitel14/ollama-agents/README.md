# Kapitel 14: Ollama-spezifische Agent-Patterns

## Beispielcode

Dieses Kapitel zeigt Patterns, die speziell für Ollama und 
lokale LLMs relevant sind.

## Themen

1. **Function Calling ohne native Unterstützung**
   - Ollama hat kein echtes Function Calling wie GPT-4
   - Prompting-Strategien für Tool-Auswahl

2. **Structured Output erzwingen**
   - JSON-Mode mit Ollama
   - Validierung und Retry-Strategien

3. **Tool-Auswahl mit kleinen Modellen**
   - Was funktioniert mit 7B/13B vs. 70B?
   - Modell-spezifische Anpassungen

4. **Multi-Model-Agents**
   - Router → Specialist Pattern
   - Kleine Modelle für Routing, große für Ausführung

## Voraussetzungen

- Kapitel 11-13 vollständig durchgearbeitet
- Mindestens 16 GB RAM empfohlen
- Verschiedene Modellgrößen verfügbar
