#!/bin/bash
#
# Ollama Installation Script
# Kapitel 3: Installation & Grundkonfiguration
#
# Verwendung: ./install-ollama.sh
#

set -e

echo "========================================"
echo "  Ollama Installation"
echo "  Kapitel 3 - Setup Tools"
echo "========================================"
echo ""

OS=$(uname -s)
ARCH=$(uname -m)

echo "System erkannt: $OS ($ARCH)"
echo ""

# Prüfen ob bereits installiert
if command -v ollama &> /dev/null; then
    CURRENT_VERSION=$(ollama --version 2>&1 | head -1)
    echo "Ollama ist bereits installiert: $CURRENT_VERSION"
    read -p "Möchten Sie neu installieren/aktualisieren? (j/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Jj]$ ]]; then
        echo "Abgebrochen."
        exit 0
    fi
fi

case "$OS" in
    "Darwin")
        echo "macOS erkannt."
        echo ""

        # Prüfen ob Homebrew verfügbar
        if command -v brew &> /dev/null; then
            echo "Option 1: Installation via Homebrew (empfohlen)"
            echo "  brew install ollama"
            echo ""
            echo "Option 2: Installation via curl"
            echo "  curl -fsSL https://ollama.com/install.sh | sh"
            echo ""
            read -p "Homebrew verwenden? (J/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                echo "Installiere via Homebrew..."
                brew install ollama
            else
                echo "Installiere via curl..."
                curl -fsSL https://ollama.com/install.sh | sh
            fi
        else
            echo "Homebrew nicht gefunden. Installiere via curl..."
            curl -fsSL https://ollama.com/install.sh | sh
        fi

        echo ""
        echo "Installation abgeschlossen!"
        echo ""
        echo "Starten Sie Ollama mit:"
        echo "  ollama serve"
        echo ""
        echo "Oder installieren Sie die App von:"
        echo "  https://ollama.com/download"
        ;;

    "Linux")
        echo "Linux erkannt."
        echo ""
        echo "Installiere via offizielles Script..."
        curl -fsSL https://ollama.com/install.sh | sh

        echo ""
        echo "Installation abgeschlossen!"
        echo ""

        # Prüfen ob systemd
        if command -v systemctl &> /dev/null; then
            echo "Systemd erkannt. Ollama Service prüfen:"
            echo "  sudo systemctl status ollama"
            echo ""
            echo "Service starten:"
            echo "  sudo systemctl start ollama"
            echo ""
            echo "Autostart aktivieren:"
            echo "  sudo systemctl enable ollama"
        else
            echo "Starten Sie Ollama mit:"
            echo "  ollama serve"
        fi
        ;;

    *)
        echo "Nicht unterstütztes Betriebssystem: $OS"
        echo ""
        echo "Bitte besuchen Sie https://ollama.com/download"
        echo "für manuelle Installation."
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "  Nächste Schritte"
echo "========================================"
echo ""
echo "1. Prüfen Sie die Installation:"
echo "   ollama --version"
echo ""
echo "2. Laden Sie ein Modell herunter:"
echo "   ollama pull llama3.2"
echo ""
echo "3. Testen Sie das Modell:"
echo "   ollama run llama3.2 'Sag Hallo!'"
echo ""
echo "4. Führen Sie den System-Check aus:"
echo "   ./check-installation.sh"
echo ""
