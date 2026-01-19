# Security Configs

Security-Konfigurationen für Ollama in Enterprise-Umgebungen - Kapitel 15.

## Struktur

```
security-configs/
├── kubernetes/
│   ├── network-policy.yaml    # Network Policies
│   └── pod-security.yaml      # Pod Security + Deployment
├── firewall/
│   └── iptables-rules.sh      # Linux Firewall
└── README.md
```

## Kubernetes

### Network Policies

Die Network Policies implementieren ein "Deny All, Allow Specific" Pattern:

1. **Default Deny**: Alle Ingress/Egress blockiert
2. **Ollama Ingress**: Nur von Backend-Apps, Ingress Controller, Prometheus
3. **Ollama Egress**: Nur DNS erlaubt
4. **Backend Egress**: Zu Ollama und DNS

```bash
# Anwenden
kubectl apply -f kubernetes/network-policy.yaml

# Prüfen
kubectl get networkpolicies -n ollama
kubectl describe networkpolicy ollama-ingress -n ollama
```

### Pod Security

- **Non-Root User**: Container läuft als UID 1000
- **Read-Only Filesystem**: Wo möglich aktiviert
- **Capabilities dropped**: Alle Capabilities entfernt
- **Seccomp**: RuntimeDefault Profile
- **Resource Limits**: CPU und Memory begrenzt

```bash
# Deployment anwenden
kubectl apply -f kubernetes/pod-security.yaml

# Status prüfen
kubectl get pods -n ollama
kubectl describe pod -l app=ollama -n ollama
```

## Linux Firewall

### iptables

```bash
# WICHTIG: Erst prüfen, dann ausführen!
cat firewall/iptables-rules.sh

# Ausführen
sudo chmod +x firewall/iptables-rules.sh
sudo ./firewall/iptables-rules.sh

# Aktive Rules anzeigen
sudo iptables -L -n -v
```

**Erlaubte Zugriffe:**
- SSH (Port 22) von überall
- Ollama (Port 11434) nur aus internen Netzen
- Monitoring nur aus internen Netzen

**Rate Limiting:**
- Max 10 neue Verbindungen/Sekunde zu Ollama

## Security Checklist

### Netzwerk

- [ ] Network Policies aktiv
- [ ] Nur notwendige Ports offen
- [ ] Rate Limiting konfiguriert
- [ ] Logging aktiviert

### Container/Pod

- [ ] Non-Root User
- [ ] Capabilities gedroppt
- [ ] Resource Limits gesetzt
- [ ] Read-Only Filesystem (wo möglich)
- [ ] Seccomp Profile aktiv

### Authentifizierung

- [ ] API-Keys oder OAuth für Ollama-Zugriff
- [ ] mTLS für interne Kommunikation
- [ ] Service Accounts mit minimalen Rechten

### Monitoring

- [ ] Audit Logs aktiviert
- [ ] Alerts für Security Events
- [ ] Regelmäßige Log-Review

## Best Practices

1. **Principle of Least Privilege**: Nur notwendige Berechtigungen
2. **Defense in Depth**: Mehrere Sicherheitsebenen
3. **Immutable Infrastructure**: Container nicht zur Laufzeit ändern
4. **Secrets Management**: Keine Secrets in Config-Dateien
5. **Regular Updates**: Container-Images regelmäßig aktualisieren
