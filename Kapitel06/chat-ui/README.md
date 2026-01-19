# Ollama Chat UI

Chat-Oberfläche mit Ollama Backend - Beispielcode aus Kapitel 6.

## Features

- Echtzeit-Streaming von Antworten
- Multi-Conversation Support
- Markdown-Rendering mit Syntax Highlighting
- Persistierte Chat-History (LocalStorage)
- Modell-Auswahl
- Konfigurierbarer System-Prompt
- Dark Mode Design

## Voraussetzungen

- Node.js 18+
- Ollama läuft (`ollama serve`)
- Mindestens ein Modell installiert (`ollama pull llama3.2`)

## Installation

```bash
npm install
```

## Entwicklung

```bash
npm run dev
```

Öffnen Sie [http://localhost:3000](http://localhost:3000) im Browser.

## Produktion

```bash
npm run build
npm run start
```

## Vercel Deployment

### Voraussetzung: Öffentlicher Ollama-Server

Vercel kann nicht auf `localhost:11434` zugreifen. Sie benötigen einen öffentlich erreichbaren Ollama-Server:

**Option 1: Eigener Server mit Reverse-Proxy**
```bash
# Auf Ihrem Server (z.B. VPS mit GPU)
ollama serve

# Nginx-Proxy für HTTPS (empfohlen)
# /etc/nginx/sites-available/ollama
server {
    listen 443 ssl;
    server_name ollama.ihre-domain.de;

    location / {
        proxy_pass http://127.0.0.1:11434;
        proxy_set_header Host $host;
    }
}
```

**Option 2: Tailscale/Cloudflare Tunnel**
```bash
# Tailscale Funnel (einfachste Option)
tailscale funnel 11434
```

### Deployment-Schritte

1. **Repository zu Vercel verbinden**
   ```bash
   # Via CLI
   npx vercel

   # Oder: vercel.com → "Import Project"
   ```

2. **Environment Variable setzen**
   ```
   OLLAMA_BASE_URL=https://ollama.ihre-domain.de
   ```

3. **Build & Deploy**
   ```bash
   npx vercel --prod
   ```

### Wichtig

- Der Ollama-Server muss CORS erlauben (oder durch Vercel-API proxied werden)
- HTTPS ist für Production erforderlich
- Die API-Route (`/api/chat`) fungiert als Proxy und umgeht CORS-Probleme

## Projektstruktur

```
chat-ui/
├── src/
│   ├── app/
│   │   ├── api/chat/
│   │   │   └── route.ts      # API-Endpoint (Ollama Proxy)
│   │   ├── layout.tsx        # Root Layout
│   │   ├── page.tsx          # Chat-Seite
│   │   └── globals.css       # Global Styles
│   ├── components/
│   │   ├── Chat.tsx          # Haupt-Container
│   │   ├── MessageList.tsx   # Nachrichtenliste
│   │   ├── Message.tsx       # Einzelne Nachricht
│   │   ├── MessageInput.tsx  # Eingabefeld
│   │   └── Sidebar.tsx       # Conversation-Liste
│   ├── hooks/
│   │   └── useChat.ts        # Chat-Logik Hook
│   └── store/
│       └── chatStore.ts      # Zustand State Management
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Technologien

- **Next.js 14** - React Framework mit App Router
- **Tailwind CSS** - Utility-first CSS
- **Zustand** - State Management
- **react-markdown** - Markdown Rendering
- **react-syntax-highlighter** - Code Highlighting
- **ollama** - Ollama SDK

## Anpassungen

### Modelle hinzufügen

In `src/components/Chat.tsx` können weitere Modelle zur Auswahl hinzugefügt werden:

```tsx
<select value={model} onChange={(e) => setModel(e.target.value)}>
  <option value="llama3.2">Llama 3.2</option>
  <option value="ihr-modell">Ihr Modell</option>
</select>
```

### System-Prompts

Vordefinierte Prompts können in `src/components/Sidebar.tsx` angepasst werden.

## Screenshots

Die Anwendung bietet:
- Dunkles Design optimiert für lange Nutzung
- Responsive Layout
- Code-Blöcke mit Syntax Highlighting
- Copy-Button für Code-Snippets
