# Ops: Betrieb & Skalierung

Deployment-Konfigurationen für Ollama in Produktion - Kapitel 14.

## Struktur

```
ops/
├── docker-compose.yml           # Full Stack (Ollama + Monitoring)
├── docker-compose.gpu.yml       # GPU-Version
├── prometheus.yml               # Prometheus Scrape Config
├── alerts.yml                   # Alerting Rules
├── promtail.yml                 # Log Collection
├── systemd/
│   ├── ollama.service           # systemd Unit (CPU)
│   └── ollama-gpu.service       # systemd Unit (GPU)
└── grafana/
    ├── dashboards/
    │   └── ollama-dashboard.json
    └── provisioning/
        ├── datasources/
        │   └── datasources.yml
        └── dashboards/
            └── dashboards.yml
```

## Quick Start

### Docker Compose

```bash
# CPU-Version
docker compose up -d

# GPU-Version (NVIDIA)
docker compose -f docker-compose.gpu.yml up -d

# Status prüfen
docker compose ps
docker compose logs -f ollama
```

### Zugriff

| Service | URL |
|---------|-----|
| Ollama | http://localhost:11434 |
| Grafana | http://localhost:3000 (admin/admin) |
| Prometheus | http://localhost:9090 |
| Traefik Dashboard | http://localhost:8080 |

### systemd (Bare Metal)

```bash
# User erstellen
sudo useradd -r -s /bin/false -d /var/lib/ollama ollama
sudo mkdir -p /var/lib/ollama
sudo chown ollama:ollama /var/lib/ollama

# Service installieren
sudo cp systemd/ollama.service /etc/systemd/system/
# Oder für GPU:
sudo cp systemd/ollama-gpu.service /etc/systemd/system/ollama.service

# Aktivieren
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama

# Status
sudo systemctl status ollama
journalctl -u ollama -f
```

## Monitoring

### Prometheus Metriken

- **System**: CPU, Memory, Disk (via node-exporter)
- **GPU**: Temperatur, VRAM (via nvidia-exporter)
- **Traefik**: Requests, Latenz
- **Container**: Restarts, OOM Events

### Alerts

| Alert | Bedingung | Severity |
|-------|-----------|----------|
| OllamaDown | Service nicht erreichbar | critical |
| HighCPUUsage | CPU >80% für 10min | warning |
| HighMemoryUsage | RAM >85% für 5min | warning |
| GPUHighTemperature | >80°C für 5min | warning |
| DiskSpaceLow | Disk >85% | warning |

### Grafana Dashboard

Das Dashboard zeigt:
- Ollama Status (UP/DOWN)
- System-Auslastung (CPU, RAM)
- GPU-Metriken (Temperatur, VRAM)
- Request-Rate und Latenz
- Response-Time Percentiles

**Import:**
1. Grafana öffnen
2. Dashboards → Import
3. JSON aus `grafana/dashboards/ollama-dashboard.json` einfügen

## Skalierung

### Horizontal (Multiple Instances)

```yaml
# In docker-compose.yml
services:
  ollama:
    deploy:
      replicas: 2
```

Mit Load Balancer (Traefik):
```yaml
labels:
  - "traefik.http.services.ollama.loadbalancer.sticky.cookie=true"
```

### Vertikal

```yaml
# Memory Limits anpassen
deploy:
  resources:
    limits:
      memory: 32G
    reservations:
      memory: 16G
```

### GPU Sharding

Für mehrere GPUs:
```bash
# GPU 0 für Modell A
CUDA_VISIBLE_DEVICES=0 ollama serve --port 11434

# GPU 1 für Modell B
CUDA_VISIBLE_DEVICES=1 ollama serve --port 11435
```

## Backup

### Modelle sichern

```bash
# Docker Volume
docker run --rm -v ollama_data:/data -v $(pwd):/backup \
  alpine tar cvf /backup/ollama-backup.tar /data

# Restore
docker run --rm -v ollama_data:/data -v $(pwd):/backup \
  alpine tar xvf /backup/ollama-backup.tar -C /
```

### Prometheus Daten

```bash
# Snapshot erstellen
curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot
```

## Security

### Netzwerk isolieren

```yaml
networks:
  ollama-internal:
    internal: true  # Kein Internet-Zugriff
```

### Rate Limiting (Traefik)

```yaml
labels:
  - "traefik.http.middlewares.ollama-ratelimit.ratelimit.average=10"
  - "traefik.http.middlewares.ollama-ratelimit.ratelimit.burst=20"
```

### Authentication

Siehe Kapitel 15 für detaillierte Security-Konfiguration.

## Troubleshooting

### Ollama startet nicht

```bash
# Logs prüfen
journalctl -u ollama -n 100
docker compose logs ollama

# Port belegt?
lsof -i :11434
```

### GPU nicht erkannt

```bash
# NVIDIA Status
nvidia-smi

# Docker GPU Support
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

### Hohe Latenz

1. Modell-Größe prüfen (kleineres Modell wählen)
2. `OLLAMA_NUM_PARALLEL` reduzieren
3. RAM/VRAM Auslastung prüfen
4. Flash Attention aktivieren: `OLLAMA_FLASH_ATTENTION=true`
