#!/bin/bash
#
# Ollama Installation Check Script
# Kapitel 3: Installation & Grundkonfiguration
#
# Verwendung: ./check-installation.sh
#

set -e

echo "========================================"
echo "  Ollama Installation Check"
echo "  Kapitel 3 - Setup Tools"
echo "========================================"
echo ""

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Hilfsfunktionen
check_ok() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}!${NC} $1"
}

# 1. Ollama Binary
echo "1. Prüfe Ollama Installation..."
if command -v ollama &> /dev/null; then
    VERSION=$(ollama --version 2>&1 | head -1)
    check_ok "Ollama installiert: $VERSION"
else
    check_fail "Ollama nicht gefunden"
    echo "   Installation: https://ollama.com/download"
    exit 1
fi

# 2. Ollama Server
echo ""
echo "2. Prüfe Ollama Server..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    check_ok "Ollama Server läuft auf localhost:11434"
else
    check_warn "Ollama Server nicht erreichbar"
    echo "   Starten mit: ollama serve"
fi

# 3. Betriebssystem
echo ""
echo "3. System-Informationen..."
OS=$(uname -s)
ARCH=$(uname -m)
check_ok "Betriebssystem: $OS ($ARCH)"

# 4. RAM
echo ""
echo "4. Prüfe Arbeitsspeicher..."
if [[ "$OS" == "Darwin" ]]; then
    # macOS
    RAM_BYTES=$(sysctl -n hw.memsize)
    RAM_GB=$((RAM_BYTES / 1024 / 1024 / 1024))
elif [[ "$OS" == "Linux" ]]; then
    # Linux
    RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    RAM_GB=$((RAM_KB / 1024 / 1024))
else
    RAM_GB=0
fi

if [[ $RAM_GB -ge 32 ]]; then
    check_ok "RAM: ${RAM_GB}GB (Empfohlen für 13B+ Modelle)"
elif [[ $RAM_GB -ge 16 ]]; then
    check_ok "RAM: ${RAM_GB}GB (Gut für 7-8B Modelle)"
elif [[ $RAM_GB -ge 8 ]]; then
    check_warn "RAM: ${RAM_GB}GB (Minimum, nur kleine Modelle)"
else
    check_fail "RAM: ${RAM_GB}GB (Nicht ausreichend)"
fi

# 5. GPU Check
echo ""
echo "5. Prüfe GPU..."

# NVIDIA
if command -v nvidia-smi &> /dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    GPU_VRAM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null | head -1)
    check_ok "NVIDIA GPU: $GPU_NAME ($GPU_VRAM)"
# AMD ROCm
elif command -v rocm-smi &> /dev/null; then
    check_ok "AMD GPU mit ROCm erkannt"
# Apple Silicon
elif [[ "$OS" == "Darwin" ]] && [[ "$ARCH" == "arm64" ]]; then
    CHIP=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Apple Silicon")
    check_ok "Apple Silicon: $CHIP (Metal-Beschleunigung)"
else
    check_warn "Keine dedizierte GPU erkannt (CPU-only Modus)"
fi

# 6. Disk Space
echo ""
echo "6. Prüfe Speicherplatz..."
if [[ "$OS" == "Darwin" ]]; then
    OLLAMA_DIR="$HOME/.ollama"
else
    OLLAMA_DIR="$HOME/.ollama"
fi

if [[ -d "$OLLAMA_DIR" ]]; then
    if [[ "$OS" == "Darwin" ]]; then
        USED=$(du -sh "$OLLAMA_DIR" 2>/dev/null | cut -f1)
    else
        USED=$(du -sh "$OLLAMA_DIR" 2>/dev/null | cut -f1)
    fi
    check_ok "Ollama-Verzeichnis: $OLLAMA_DIR ($USED verwendet)"
else
    check_ok "Ollama-Verzeichnis wird bei erstem Modell-Download erstellt"
fi

# Freier Speicher
if [[ "$OS" == "Darwin" ]]; then
    FREE_GB=$(df -g "$HOME" | tail -1 | awk '{print $4}')
else
    FREE_GB=$(df -BG "$HOME" | tail -1 | awk '{print $4}' | tr -d 'G')
fi
check_ok "Freier Speicher: ${FREE_GB}GB"

# 7. Installierte Modelle
echo ""
echo "7. Installierte Modelle..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    if [[ -n "$MODELS" ]]; then
        echo "$MODELS" | while read model; do
            check_ok "  $model"
        done
    else
        check_warn "  Keine Modelle installiert"
        echo "     Installieren mit: ollama pull llama3.2"
    fi
else
    check_warn "  Server nicht erreichbar, kann Modelle nicht prüfen"
fi

# 8. Netzwerk-Konfiguration
echo ""
echo "8. Netzwerk-Konfiguration..."
OLLAMA_HOST=${OLLAMA_HOST:-"127.0.0.1:11434"}
check_ok "OLLAMA_HOST: $OLLAMA_HOST"

if [[ "$OLLAMA_HOST" == *"0.0.0.0"* ]]; then
    check_warn "Ollama ist im Netzwerk erreichbar (kein Auth!)"
fi

# Zusammenfassung
echo ""
echo "========================================"
echo "  Zusammenfassung"
echo "========================================"
echo ""
echo "System: $OS $ARCH"
echo "RAM: ${RAM_GB}GB"
echo "Ollama: $(ollama --version 2>&1 | head -1)"
echo ""

# Empfehlung
if [[ $RAM_GB -ge 32 ]]; then
    echo "Empfohlene Modelle:"
    echo "  - llama3.3:70b-instruct-q4_K_M (bei 64GB+ RAM)"
    echo "  - qwen2.5:32b"
    echo "  - llama3.2:latest"
elif [[ $RAM_GB -ge 16 ]]; then
    echo "Empfohlene Modelle:"
    echo "  - llama3.2:latest"
    echo "  - qwen2.5-coder:14b"
    echo "  - mistral:latest"
else
    echo "Empfohlene Modelle (für begrenzten RAM):"
    echo "  - phi3:latest"
    echo "  - llama3.2:3b"
    echo "  - qwen2.5:3b"
fi

echo ""
echo "Nächste Schritte:"
echo "  1. ollama pull <model>  - Modell herunterladen"
echo "  2. ollama run <model>   - Modell testen"
echo "  3. ./benchmark.sh       - Performance messen"
echo ""
