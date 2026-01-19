# Lösungen Kapitel 6: Einfache Chat-UI

Die vollständige Implementierung befindet sich in `Kapitel06/chat-ui/`.

## Übungen

### Übung 1-4: UI-Erweiterungen
Die Lösungen sind direkt in die Chat-UI integriert:
- Message-History
- Markdown-Rendering
- Code-Highlighting
- Streaming-Anzeige

### Übung 5: System-Prompt-Selector
```typescript
// In src/components/Chat.tsx hinzufügen:
const systemPrompts = {
  default: 'Du bist ein hilfreicher Assistent.',
  coder: 'Du bist ein erfahrener Programmierer. Antworte mit Code-Beispielen.',
  teacher: 'Du bist ein geduldiger Lehrer. Erkläre Konzepte einfach.',
};

// State hinzufügen
const [activePrompt, setActivePrompt] = useState<keyof typeof systemPrompts>('default');
```

### Übung 6: Dark Mode
```typescript
// In tailwind.config.ts:
darkMode: 'class',

// Toggle-Komponente:
const toggleDarkMode = () => {
  document.documentElement.classList.toggle('dark');
};
```

Starten Sie die Chat-UI mit:
```bash
cd Kapitel06/chat-ui
npm install
npm run dev
```
