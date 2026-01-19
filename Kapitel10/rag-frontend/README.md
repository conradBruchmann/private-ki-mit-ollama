# RAG-Frontend mit Zugriffskontrolle

Mandantenfähiges RAG-Frontend mit Authentifizierung und rollenbasierter Zugriffskontrolle - Beispielcode aus Kapitel 10.

## Features

- **Authentifizierung**: JWT-basierte Authentifizierung mit Refresh-Tokens
- **Rollenbasierte Zugriffskontrolle**: Admin, Manager, Employee, Guest
- **Mandantenfähigkeit**: Tenant-Isolation für Multi-Tenant-Setups
- **RAG-Chat**: Dokumentenbasierte Q&A mit Quellenangaben
- **Document Browser**: Dokumentenverwaltung mit Access-Level-Änderung
- **Audit-Logging**: Compliance-konformes Logging aller Zugriffe

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                RAG-Frontend mit Access Control              │
│                                                             │
│  User → Login → Rolle prüfen → Dokumente filtern → Antwort │
│                                                             │
│  "Jeder sieht nur, was er sehen darf."                     │
└─────────────────────────────────────────────────────────────┘
```

## Zugriffsstufen

| Level | Beschreibung | Rollen |
|-------|--------------|--------|
| **public** | Öffentliche Dokumente | Alle |
| **internal** | Nur Mitarbeiter | employee, manager, admin |
| **confidential** | Vertraulich | manager, admin |
| **restricted** | Streng geheim | admin |

## Voraussetzungen

- Node.js 18+
- Ollama mit einem Modell (z.B. llama3.2)

```bash
# Modell installieren
ollama pull llama3.2
```

## Quick Start

### 1. Backend starten

```bash
cd backend
npm install
npm run dev
```

Backend läuft auf http://localhost:3001

### 2. Frontend starten

```bash
cd frontend
npm install
npm run dev
```

Frontend läuft auf http://localhost:3000

### 3. Demo-Login

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Admin | admin@demo.de | admin123 |
| Manager | manager@demo.de | manager123 |
| Mitarbeiter | mitarbeiter@demo.de | mitarbeiter123 |
| Gast | gast@demo.de | gast123 |

## API-Dokumentation

### Auth

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo.de", "password": "admin123"}'

# Aktueller User
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer <token>"
```

### RAG Query

```bash
# Query ausführen
curl -X POST http://localhost:3001/api/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "Was sind die Urlaubsregelungen?"}'

# Streaming Query
curl -X POST http://localhost:3001/api/query/stream \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "Was sind die Urlaubsregelungen?"}'
```

### Documents

```bash
# Dokumente auflisten
curl http://localhost:3001/api/documents \
  -H "Authorization: Bearer <token>"

# Access Level ändern (Admin/Manager)
curl -X PATCH http://localhost:3001/api/documents/<id>/access \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"accessLevel": "confidential"}'
```

### Audit (nur Admin)

```bash
# Audit-Logs abrufen
curl "http://localhost:3001/api/audit?page=1&pageSize=20" \
  -H "Authorization: Bearer <token>"
```

## Docker Deployment

```bash
# Standard (CPU)
docker compose -f docker/docker-compose.yml up -d

# Mit GPU
docker compose -f docker/docker-compose.gpu.yml up -d
```

## Projektstruktur

```
rag-frontend/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── types.ts       # User, Role, Permission Types
│   │   │   ├── jwt.ts         # JWT Token-Handling
│   │   │   ├── middleware.ts  # Auth Middleware
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── user-service.ts      # User-Verwaltung
│   │   │   ├── document-service.ts  # Dokument-Verwaltung
│   │   │   ├── query-service.ts     # RAG Query Engine
│   │   │   └── audit-service.ts     # Audit-Logging
│   │   ├── routes/
│   │   │   ├── auth-routes.ts
│   │   │   ├── query-routes.ts
│   │   │   ├── document-routes.ts
│   │   │   └── audit-routes.ts
│   │   └── index.ts           # Express Server
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── stores/
│   │   │   └── auth-store.ts  # Zustand Auth Store
│   │   ├── lib/
│   │   │   └── api-client.ts  # API Client
│   │   ├── components/
│   │   │   ├── Login.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── RAGChat.tsx
│   │   │   ├── DocumentBrowser.tsx
│   │   │   └── AuditLog.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.gpu.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── .env.example
└── README.md
```

## Sicherheitsfeatures

- **JWT Authentication**: Token-basierte Auth mit Refresh-Tokens
- **Role-Based Access Control (RBAC)**: Rollen mit unterschiedlichen Berechtigungen
- **Tenant Isolation**: Daten sind pro Tenant isoliert
- **Defense in Depth**: Mehrfache Zugriffsüberprüfung
- **Audit Logging**: Alle Zugriffe werden protokolliert
- **Access Level auf Dokumenten-Ebene**: Feingranulare Kontrolle

## Umgebungsvariablen

| Variable | Beschreibung | Default |
|----------|--------------|---------|
| `JWT_SECRET` | Secret für JWT-Signierung | - |
| `JWT_EXPIRES_IN` | Token-Gültigkeit | `8h` |
| `OLLAMA_URL` | Ollama Server URL | `http://localhost:11434` |
| `RAG_MODEL` | LLM für RAG | `llama3.2` |
| `CORS_ORIGIN` | Erlaubte Frontend-URL | `http://localhost:3000` |
| `PORT` | Backend Port | `3001` |

## Troubleshooting

### Login funktioniert nicht

```bash
# Backend-Logs prüfen
npm run dev  # im backend/ Ordner

# Demo-User werden automatisch erstellt
```

### RAG-Antworten fehlen

```bash
# Ollama prüfen
curl http://localhost:11434/api/tags

# Modell laden
ollama pull llama3.2
```

### Token abgelaufen

Das Frontend versucht automatisch, den Token zu refreshen. Bei Fehlern wird der User ausgeloggt.

## Erweiterungsmöglichkeiten

1. **OAuth2/OIDC**: Integration mit Keycloak oder Auth0
2. **Fine-grained Permissions**: Dokumenten-spezifische Berechtigungen
3. **Rate Limiting**: Pro-Rolle unterschiedliche Limits
4. **Vector Store**: Integration mit ChromaDB oder Pinecone
5. **File Upload**: Dokumente hochladen und indizieren
