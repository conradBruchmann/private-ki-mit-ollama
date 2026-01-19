#!/usr/bin/env tsx
/**
 * KI Pre-Commit Check
 * Kapitel 13: Integration in Dev-Workflows
 *
 * Schneller Check der staged Änderungen vor dem Commit.
 */

import { execSync } from 'child_process';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// =============================================================================
// Quick Check Prompt
// =============================================================================

const CHECK_PROMPT = `Prüfe diesen Code-Diff auf offensichtliche Probleme.

DIFF:
{diff}

Antworte mit einem JSON-Objekt:
{
  "pass": true/false,
  "issues": ["Problem 1", "Problem 2"],
  "severity": "ok" | "warning" | "critical"
}

Prüfe auf:
- Syntax-Fehler
- Debug-Code (console.log, debugger)
- Auskommentierter Code
- Hardcoded Secrets/Credentials
- TODO/FIXME ohne Ticket-Referenz
- Offensichtliche Bugs

Sei streng bei Security-Issues, tolerant bei Style.
Antworte NUR mit JSON.`;

// =============================================================================
// Logic
// =============================================================================

async function quickCheck(diff: string): Promise<{
  pass: boolean;
  issues: string[];
  severity: 'ok' | 'warning' | 'critical';
}> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: CHECK_PROMPT.replace('{diff}', diff.slice(0, 5000)),
      stream: false,
      options: { temperature: 0.1, num_predict: 500 }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  const jsonMatch = data.response.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return { pass: true, issues: [], severity: 'ok' };
  }

  return JSON.parse(jsonMatch[0]);
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  // Staged Diff holen
  let diff: string;
  try {
    diff = execSync('git diff --cached', { encoding: 'utf-8' });
  } catch {
    console.log('✅ Keine Änderungen zum Prüfen');
    process.exit(0);
  }

  if (!diff.trim()) {
    console.log('✅ Keine Änderungen zum Prüfen');
    process.exit(0);
  }

  // Ollama prüfen
  try {
    const check = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!check.ok) throw new Error();
  } catch {
    console.log('⚠️  Ollama nicht erreichbar - Check übersprungen');
    process.exit(0);
  }

  console.log('🔍 KI Pre-Commit Check...');

  try {
    const result = await quickCheck(diff);

    if (result.pass) {
      console.log('✅ Check bestanden');
      process.exit(0);
    }

    console.log(`\n⚠️  ${result.severity.toUpperCase()}: Issues gefunden\n`);

    for (const issue of result.issues) {
      const icon = result.severity === 'critical' ? '🚨' : '⚠️';
      console.log(`${icon} ${issue}`);
    }

    // Bei kritischen Issues: Commit blockieren
    if (result.severity === 'critical') {
      console.log('\n❌ Commit blockiert wegen kritischer Issues');
      console.log('   Verwende SKIP_AI_CHECK=1 um zu überspringen');
      process.exit(1);
    }

    // Warnings durchlassen
    console.log('\n⚠️  Warnings gefunden, Commit wird fortgesetzt');
    process.exit(0);

  } catch (error) {
    console.error('❌ Check fehlgeschlagen:', error);
    // Bei Fehlern nicht blockieren
    process.exit(0);
  }
}

main();
