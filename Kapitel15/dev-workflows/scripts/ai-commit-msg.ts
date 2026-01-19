#!/usr/bin/env tsx
/**
 * KI-generierte Commit-Messages
 * Kapitel 13: Integration in Dev-Workflows
 *
 * Generiert oder verbessert Commit-Messages basierend auf dem Diff.
 */

import { execSync } from 'child_process';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// =============================================================================
// Prompts
// =============================================================================

const GENERATE_PROMPT = `Analysiere diesen Git-Diff und erstelle eine Commit-Message im Conventional Commits Format.

DIFF:
{diff}

Format: type(scope): description

Types:
- feat: Neues Feature
- fix: Bug-Fix
- docs: Dokumentation
- style: Formatierung (kein Code-Change)
- refactor: Refactoring
- test: Tests
- chore: Maintenance

Regeln:
- Erste Zeile max 72 Zeichen
- Imperativ ("Add" nicht "Added")
- Scope ist optional aber hilfreich
- Beschreibung beginnt klein

Antworte NUR mit der Commit-Message, nichts anderes.`;

const IMPROVE_PROMPT = `Verbessere diese Commit-Message zum Conventional Commits Format.

Aktuelle Message: {message}

Context (Diff):
{diff}

Regeln:
- Format: type(scope): description
- Max 72 Zeichen erste Zeile
- Imperativ verwenden

Antworte NUR mit der verbesserten Commit-Message.`;

// =============================================================================
// Logic
// =============================================================================

async function callOllama(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.3, num_predict: 200 }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  return data.response.trim();
}

function getStagedDiff(): string {
  try {
    return execSync('git diff --cached', { encoding: 'utf-8' });
  } catch {
    return '';
  }
}

function getDiffStat(): string {
  try {
    return execSync('git diff --cached --stat', { encoding: 'utf-8' });
  } catch {
    return '';
  }
}

async function generateCommitMessage(): Promise<string> {
  const diff = getStagedDiff();

  if (!diff) {
    throw new Error('Keine staged Änderungen');
  }

  // Diff kürzen für Prompt
  const truncatedDiff = diff.slice(0, 5000);
  const prompt = GENERATE_PROMPT.replace('{diff}', truncatedDiff);

  return callOllama(prompt);
}

async function improveCommitMessage(currentMessage: string): Promise<string> {
  const diff = getDiffStat();
  const prompt = IMPROVE_PROMPT
    .replace('{message}', currentMessage)
    .replace('{diff}', diff);

  return callOllama(prompt);
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const currentMessage = args[0];
  const diffContext = args[1];

  try {
    let result: string;

    if (currentMessage) {
      // Bestehende Message verbessern
      console.error('🔄 Verbessere Commit-Message...');
      result = await improveCommitMessage(currentMessage);
    } else {
      // Neue Message generieren
      console.error('✨ Generiere Commit-Message...');
      result = await generateCommitMessage();
    }

    // Nur die Message ausgeben (für Shell-Integration)
    console.log(result);

  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

main();
