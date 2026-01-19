#!/bin/bash
#
# Ollama Benchmark Script
# Kapitel 3: Installation & Grundkonfiguration
#
# Verwendung: ./benchmark.sh [model]
# Beispiel:   ./benchmark.sh llama3.2
#

set -e

MODEL=${1:-"phi3"}
OLLAMA_URL=${OLLAMA_URL:-"http://localhost:11434"}
PROMPT="Zähle von 1 bis 50 und schreibe jede Zahl auf eine neue Zeile."

echo "========================================"
echo "  Ollama Benchmark"
echo "  Kapitel 3 - Setup Tools"
echo "========================================"
echo ""
echo "Modell: $MODEL"
echo "URL: $OLLAMA_URL"
echo ""

# Prüfen ob Server läuft
if ! curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
    echo "Fehler: Ollama Server nicht erreichbar"
    echo "Starten mit: ollama serve"
    exit 1
fi

# Prüfen ob Modell existiert
if ! curl -s "$OLLAMA_URL/api/tags" | grep -q "\"$MODEL"; then
    echo "Fehler: Modell '$MODEL' nicht gefunden"
    echo "Installieren mit: ollama pull $MODEL"
    exit 1
fi

echo "Starte Benchmark..."
echo ""

# Warmup (erstes Request ist oft langsamer)
echo "1. Warmup..."
curl -s "$OLLAMA_URL/api/generate" -d "{
  \"model\": \"$MODEL\",
  \"prompt\": \"Sag Hallo.\",
  \"stream\": false
}" > /dev/null

# Benchmark 1: Kurzer Prompt
echo "2. Kurzer Prompt (Token-Generierung)..."
RESULT1=$(curl -s "$OLLAMA_URL/api/generate" -d "{
  \"model\": \"$MODEL\",
  \"prompt\": \"$PROMPT\",
  \"stream\": false
}")

TOKENS1=$(echo "$RESULT1" | grep -o '"eval_count":[0-9]*' | cut -d':' -f2)
DURATION1=$(echo "$RESULT1" | grep -o '"eval_duration":[0-9]*' | cut -d':' -f2)
PROMPT_TOKENS=$(echo "$RESULT1" | grep -o '"prompt_eval_count":[0-9]*' | cut -d':' -f2)

if [[ -n "$TOKENS1" ]] && [[ -n "$DURATION1" ]] && [[ "$DURATION1" -gt 0 ]]; then
    TPS1=$(echo "scale=2; $TOKENS1 / ($DURATION1 / 1000000000)" | bc)
    echo "   Generierte Tokens: $TOKENS1"
    echo "   Dauer: $(echo "scale=2; $DURATION1 / 1000000000" | bc) Sekunden"
    echo "   Speed: $TPS1 tokens/sec"
else
    echo "   Konnte Metriken nicht extrahieren"
    TPS1="N/A"
fi

# Benchmark 2: Prompt-Verarbeitung
echo ""
echo "3. Prompt-Verarbeitung..."
LONG_PROMPT="Hier ist ein längerer Text zum Testen der Prompt-Verarbeitung. Bitte fasse den folgenden Absatz zusammen: Die Entwicklung von Sprachmodellen hat in den letzten Jahren enorme Fortschritte gemacht. Moderne LLMs können komplexe Texte verstehen und generieren."

RESULT2=$(curl -s "$OLLAMA_URL/api/generate" -d "{
  \"model\": \"$MODEL\",
  \"prompt\": \"$LONG_PROMPT\",
  \"stream\": false
}")

PROMPT_DURATION=$(echo "$RESULT2" | grep -o '"prompt_eval_duration":[0-9]*' | cut -d':' -f2)
PROMPT_COUNT=$(echo "$RESULT2" | grep -o '"prompt_eval_count":[0-9]*' | cut -d':' -f2)

if [[ -n "$PROMPT_DURATION" ]] && [[ -n "$PROMPT_COUNT" ]] && [[ "$PROMPT_DURATION" -gt 0 ]]; then
    PROMPT_TPS=$(echo "scale=2; $PROMPT_COUNT / ($PROMPT_DURATION / 1000000000)" | bc)
    echo "   Prompt-Tokens: $PROMPT_COUNT"
    echo "   Prompt-Speed: $PROMPT_TPS tokens/sec"
else
    PROMPT_TPS="N/A"
fi

# Benchmark 3: Streaming-Latenz
echo ""
echo "4. First-Token-Latenz..."
START_TIME=$(date +%s%N)
FIRST_TOKEN_TIME=""

curl -s "$OLLAMA_URL/api/generate" -d "{
  \"model\": \"$MODEL\",
  \"prompt\": \"Sag einfach OK.\",
  \"stream\": true
}" | head -1 > /dev/null

END_TIME=$(date +%s%N)
LATENCY_MS=$(echo "scale=2; ($END_TIME - $START_TIME) / 1000000" | bc)
echo "   First-Token-Latenz: ${LATENCY_MS}ms"

# Zusammenfassung
echo ""
echo "========================================"
echo "  Benchmark-Ergebnis: $MODEL"
echo "========================================"
echo ""
echo "┌─────────────────────┬─────────────────┐"
echo "│ Metrik              │ Wert            │"
echo "├─────────────────────┼─────────────────┤"
printf "│ Token-Generierung   │ %13s/s │\n" "$TPS1"
printf "│ Prompt-Verarbeitung │ %13s/s │\n" "$PROMPT_TPS"
printf "│ First-Token-Latenz  │ %12sms │\n" "$LATENCY_MS"
echo "└─────────────────────┴─────────────────┘"
echo ""

# Bewertung
echo "Bewertung:"
if [[ "$TPS1" != "N/A" ]]; then
    TPS_INT=${TPS1%.*}
    if [[ $TPS_INT -ge 50 ]]; then
        echo "  Exzellent! GPU-beschleunigt oder Apple Silicon."
    elif [[ $TPS_INT -ge 20 ]]; then
        echo "  Gut. Flüssige Interaktion möglich."
    elif [[ $TPS_INT -ge 10 ]]; then
        echo "  Akzeptabel. Für Batch-Verarbeitung geeignet."
    else
        echo "  Langsam. Prüfen Sie GPU-Nutzung oder verwenden Sie kleineres Modell."
    fi
fi

echo ""
echo "Tipp: Für detaillierte GPU-Nutzung: nvidia-smi oder rocm-smi"
echo ""
