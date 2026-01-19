#!/bin/bash
# iptables Firewall Rules für Ollama Server
# Kapitel 15: Security, Datenschutz, Governance
#
# ACHTUNG: Dieses Skript modifiziert die Firewall!
# Erst prüfen, dann ausführen.
#
# Verwendung:
#   sudo ./iptables-rules.sh

set -e

# =============================================================================
# Konfiguration
# =============================================================================

# Erlaubte Netzwerke (CIDR)
ALLOWED_NETWORKS=(
    "10.0.0.0/8"        # Private Netzwerke
    "172.16.0.0/12"     # Docker Default
    "192.168.0.0/16"    # Lokale Netzwerke
)

# Ollama Port
OLLAMA_PORT=11434

# SSH Port (für Remote-Zugriff)
SSH_PORT=22

# Monitoring Ports
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
NODE_EXPORTER_PORT=9100

# =============================================================================
# Bestehende Rules löschen
# =============================================================================

echo "Lösche bestehende Rules..."
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# =============================================================================
# Default Policies
# =============================================================================

echo "Setze Default Policies..."
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# =============================================================================
# Loopback erlauben
# =============================================================================

iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# =============================================================================
# Established Connections erlauben
# =============================================================================

iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# =============================================================================
# SSH erlauben (wichtig für Remote-Zugriff!)
# =============================================================================

echo "Erlaube SSH..."
iptables -A INPUT -p tcp --dport $SSH_PORT -j ACCEPT

# =============================================================================
# Ollama nur aus erlaubten Netzwerken
# =============================================================================

echo "Konfiguriere Ollama Zugriff..."
for network in "${ALLOWED_NETWORKS[@]}"; do
    echo "  Erlaube: $network"
    iptables -A INPUT -p tcp --dport $OLLAMA_PORT -s $network -j ACCEPT
done

# Ollama von außen blockieren (explizit loggen)
iptables -A INPUT -p tcp --dport $OLLAMA_PORT -j LOG --log-prefix "OLLAMA_BLOCKED: " --log-level 4
iptables -A INPUT -p tcp --dport $OLLAMA_PORT -j DROP

# =============================================================================
# Monitoring Ports (nur intern)
# =============================================================================

echo "Konfiguriere Monitoring..."
for network in "${ALLOWED_NETWORKS[@]}"; do
    iptables -A INPUT -p tcp --dport $PROMETHEUS_PORT -s $network -j ACCEPT
    iptables -A INPUT -p tcp --dport $GRAFANA_PORT -s $network -j ACCEPT
    iptables -A INPUT -p tcp --dport $NODE_EXPORTER_PORT -s $network -j ACCEPT
done

# =============================================================================
# ICMP (Ping) erlauben
# =============================================================================

iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT
iptables -A INPUT -p icmp --icmp-type echo-reply -j ACCEPT

# =============================================================================
# Rate Limiting für neue Verbindungen
# =============================================================================

echo "Konfiguriere Rate Limiting..."
# Max 10 neue Verbindungen pro Sekunde
iptables -A INPUT -p tcp --dport $OLLAMA_PORT -m conntrack --ctstate NEW -m limit --limit 10/s --limit-burst 20 -j ACCEPT
iptables -A INPUT -p tcp --dport $OLLAMA_PORT -m conntrack --ctstate NEW -j DROP

# =============================================================================
# Logging für verworfene Pakete
# =============================================================================

iptables -A INPUT -j LOG --log-prefix "DROPPED: " --log-level 4
iptables -A INPUT -j DROP

# =============================================================================
# Rules speichern
# =============================================================================

echo "Speichere Rules..."
if command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4
    echo "Gespeichert in /etc/iptables/rules.v4"
fi

echo ""
echo "✅ Firewall konfiguriert"
echo ""
echo "Aktive Rules:"
iptables -L -n -v --line-numbers
