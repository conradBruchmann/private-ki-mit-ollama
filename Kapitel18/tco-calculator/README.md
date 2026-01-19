# TCO-Rechner: Lokal vs. Cloud

Kostenvergleich für lokale LLMs vs. Cloud-APIs - Kapitel 16.

## Verwendung

```bash
npx tsx tco-calculator.ts
```

## Ausgabe

Der Rechner vergleicht:
- **Lokale Hardware** (Mac Mini, Gaming PC, Server)
- **Cloud-APIs** (OpenAI, Anthropic, Google)
- **Nutzungsprofile** (Einzelentwickler bis Enterprise)

### Beispiel-Ausgabe

```
╔══════════════════════════════════════════════════════════════════╗
║  TCO-Rechner: Lokal vs. Cloud                                    ║
╚══════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════════════════
ÜBERSICHT: Kleines Team (50.000.000 Tokens/Monat)
═══════════════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────┬────────────┬────────────────┬─────────────┬──────────┐
│ Konfiguration           │ Lokal 3J   │ Cloud 3J       │ Ersparnis   │ Break-   │
│                         │            │ (GPT-4o-mini)  │             │ Even     │
├─────────────────────────┼────────────┼────────────────┼─────────────┼──────────┤
│ Mac Mini M4 Pro         │   3.200 €  │       18.000 € │    14.800 € │       3M │
│ Mac Studio M2 Ultra     │   6.500 €  │       18.000 € │    11.500 € │       5M │
│ Gaming PC RTX 4090      │   5.800 €  │       18.000 € │    12.200 € │       4M │
└─────────────────────────┴────────────┴────────────────┴─────────────┴──────────┘
```

## Konfigurierbare Parameter

### Hardware-Optionen

| Hardware | Preis | VRAM | Max Modell |
|----------|-------|------|------------|
| Mac Mini M4 Pro | 2.000€ | 24GB | 14B |
| Mac Studio M2 Ultra | 5.000€ | 128GB | 70B |
| Gaming PC RTX 4090 | 3.000€ | 24GB | 14B |
| Server NVIDIA A100 | 15.000€ | 80GB | 70B |

### Cloud-Preise (Stand 2024)

| Provider | Modell | Input/1M | Output/1M |
|----------|--------|----------|-----------|
| OpenAI | GPT-4o | 2,50€ | 10,00€ |
| OpenAI | GPT-4o-mini | 0,15€ | 0,60€ |
| Anthropic | Claude 3.5 Sonnet | 3,00€ | 15,00€ |

### Nutzungsprofile

| Profil | Tokens/Monat | Wachstum/Jahr |
|--------|--------------|---------------|
| Einzelentwickler | 5M | 20% |
| Kleines Team | 50M | 30% |
| Startup | 200M | 50% |
| Enterprise | 1B | 40% |

## Anpassung

Editiere die Konstanten in `tco-calculator.ts`:

```typescript
const ELECTRICITY_PRICE_KWH = 0.35;  // EUR/kWh
const MAINTENANCE_PERCENT = 0.05;    // 5% pro Jahr
```

## Nicht berücksichtigt

- Personalkosten (Admin, DevOps)
- Latenz-Unterschiede
- Datenschutz-Mehrwert
- Ausfallsicherheit
- Skalierbarkeit bei Lastspitzen
