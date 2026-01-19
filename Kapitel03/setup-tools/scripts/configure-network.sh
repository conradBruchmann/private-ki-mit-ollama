#!/bin/bash
#
# Ollama Netzwerk-Konfiguration Script
# Kapitel 3: Installation & Grundkonfiguration
#
# Verwendung: ./configure-network.sh [enable|disable|status]
#

set -e

OS=$(uname -s)
ACTION=${1:-"status"}

echo "========================================"
echo "  Ollama Netzwerk-Konfiguration"
echo "  Kapitel 3 - Setup Tools"
echo "========================================"
echo ""

show_status() {
    echo "Aktuelle Konfiguration:"
    echo ""

    OLLAMA_HOST=${OLLAMA_HOST:-"127.0.0.1:11434"}
    echo "  OLLAMA_HOST: $OLLAMA_HOST"

    if [[ "$OLLAMA_HOST" == *"0.0.0.0"* ]]; then
        echo "  Status: Netzwerk-Zugriff AKTIVIERT"
        echo ""
        echo "  WARNUNG: Ollama hat keine eingebaute Authentifizierung!"
        echo "  Empfehlung: Reverse-Proxy mit Auth verwenden."
    else
        echo "  Status: Nur localhost (sicher)"
    fi

    echo ""

    # Lokale IP anzeigen
    if [[ "$OS" == "Darwin" ]]; then
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "nicht gefunden")
    else
        LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "nicht gefunden")
    fi
    echo "  Lokale IP: $LOCAL_IP"

    # Prüfen ob erreichbar
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "  Server: Läuft"
    else
        echo "  Server: Nicht erreichbar"
    fi
}

enable_network() {
    echo "Aktiviere Netzwerk-Zugriff..."
    echo ""

    case "$OS" in
        "Darwin")
            echo "macOS: Setze Umgebungsvariable..."
            echo ""
            echo "Fügen Sie zu ~/.zshrc oder ~/.bashrc hinzu:"
            echo ""
            echo "  export OLLAMA_HOST=0.0.0.0"
            echo ""
            echo "Dann neu starten:"
            echo "  source ~/.zshrc"
            echo "  killall ollama"
            echo "  ollama serve"
            ;;

        "Linux")
            if command -v systemctl &> /dev/null; then
                echo "Linux (systemd): Erstelle Override..."
                echo ""
                echo "Führen Sie aus:"
                echo ""
                echo "  sudo systemctl edit ollama"
                echo ""
                echo "Fügen Sie hinzu:"
                echo ""
                echo "[Service]"
                echo "Environment=\"OLLAMA_HOST=0.0.0.0\""
                echo ""
                echo "Dann:"
                echo "  sudo systemctl daemon-reload"
                echo "  sudo systemctl restart ollama"
            else
                echo "Linux: Setze Umgebungsvariable..."
                echo ""
                echo "Fügen Sie zu ~/.bashrc hinzu:"
                echo ""
                echo "  export OLLAMA_HOST=0.0.0.0"
                echo ""
                echo "Dann: source ~/.bashrc && ollama serve"
            fi
            ;;
    esac

    echo ""
    echo "SICHERHEITSHINWEIS:"
    echo "==================="
    echo ""
    echo "Ollama hat KEINE eingebaute Authentifizierung!"
    echo "Wenn Sie Netzwerk-Zugriff aktivieren, empfehlen wir:"
    echo ""
    echo "1. Firewall konfigurieren (nur vertrauenswürdige IPs)"
    echo "2. Reverse-Proxy mit Basic Auth (nginx, Caddy)"
    echo "3. VPN für externen Zugriff"
    echo ""
}

disable_network() {
    echo "Deaktiviere Netzwerk-Zugriff..."
    echo ""

    case "$OS" in
        "Darwin")
            echo "macOS: Entfernen Sie OLLAMA_HOST aus ~/.zshrc"
            echo "oder setzen Sie:"
            echo ""
            echo "  export OLLAMA_HOST=127.0.0.1:11434"
            ;;

        "Linux")
            if command -v systemctl &> /dev/null; then
                echo "Linux: Entfernen Sie den Override:"
                echo ""
                echo "  sudo rm /etc/systemd/system/ollama.service.d/override.conf"
                echo "  sudo systemctl daemon-reload"
                echo "  sudo systemctl restart ollama"
            else
                echo "Linux: Entfernen Sie OLLAMA_HOST aus ~/.bashrc"
            fi
            ;;
    esac
}

case "$ACTION" in
    "status")
        show_status
        ;;
    "enable")
        enable_network
        ;;
    "disable")
        disable_network
        ;;
    *)
        echo "Verwendung: $0 [enable|disable|status]"
        echo ""
        echo "  status  - Aktuelle Konfiguration anzeigen"
        echo "  enable  - Netzwerk-Zugriff aktivieren"
        echo "  disable - Netzwerk-Zugriff deaktivieren"
        exit 1
        ;;
esac

echo ""
