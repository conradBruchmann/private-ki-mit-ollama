#!/usr/bin/env tsx
/**
 * KI-gestützte Code-Review
 * Kapitel 13: Integration in Dev-Workflows
 *
 * Analysiert Code-Änderungen mit einem lokalen LLM und generiert Review-Kommentare.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

// =============================================================================
// Types
// =============================================================================

interface ReviewResult {
  model: string;
  filesReviewed: number;
  timestamp: string;
  summary: string;
  issues: ReviewIssue[];
  suggestions: string[];
  score: number;
}

interface ReviewIssue {
  severity: 'critical' | 'warning' | 'info';
  file: string;
  line: number;
  message: string;
  suggestion?: string;
}

interface OllamaResponse {
  response: string;
  done: boolean;
}

// =============================================================================
// Ollama Client
// =============================================================================

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';

async function callOllama(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 2000
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data: OllamaResponse = await response.json();
  return data.response;
}

// =============================================================================
// Review Logic
// =============================================================================

const REVIEW_PROMPT = `Du bist ein erfahrener Code-Reviewer. Analysiere die folgenden Code-Änderungen und gib strukturiertes Feedback.

DIFF:
{diff}

Antworte im folgenden JSON-Format:
{
  "summary": "Kurze Zusammenfassung der Änderungen (1-2 Sätze)",
  "issues": [
    {
      "severity": "critical|warning|info",
      "file": "dateiname.ts",
      "line": 42,
      "message": "Beschreibung des Problems",
      "suggestion": "Vorgeschlagene Lösung"
    }
  ],
  "suggestions": [
    "Allgemeine Verbesserungsvorschläge"
  ],
  "score": 85
}

Bewerte nach:
- Code-Qualität und Lesbarkeit
- Potenzielle Bugs oder Sicherheitslücken
- Best Practices und Patterns
- Typisierung (bei TypeScript)

Severity:
- critical: Bugs, Sicherheitslücken, Breaking Changes
- warning: Code-Smell, fehlende Error-Handling, Performance
- info: Style, Verbesserungsvorschläge

Antworte NUR mit validem JSON, kein Markdown.`;

async function reviewDiff(diffContent: string): Promise<ReviewResult> {
  const prompt = REVIEW_PROMPT.replace('{diff}', diffContent.slice(0, 10000));

  const response = await callOllama(prompt);

  // JSON aus Antwort extrahieren
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Keine JSON-Antwort vom Modell');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    model: OLLAMA_MODEL,
    filesReviewed: countFilesInDiff(diffContent),
    timestamp: new Date().toISOString(),
    summary: parsed.summary || 'Keine Zusammenfassung',
    issues: parsed.issues || [],
    suggestions: parsed.suggestions || [],
    score: parsed.score || 0
  };
}

function countFilesInDiff(diff: string): number {
  const matches = diff.match(/^\+\+\+ b\//gm);
  return matches ? matches.length : 0;
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  let diffFile: string | undefined;
  let outputFile: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--diff' && args[i + 1]) {
      diffFile = args[i + 1];
    }
    if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[i + 1];
    }
  }

  // Diff lesen
  let diffContent: string;

  if (diffFile && existsSync(diffFile)) {
    diffContent = readFileSync(diffFile, 'utf-8');
  } else {
    // Von stdin lesen (für Pipes)
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    diffContent = Buffer.concat(chunks).toString('utf-8');
  }

  if (!diffContent.trim()) {
    console.log('Keine Änderungen zum Reviewen');
    process.exit(0);
  }

  console.log('🔍 Starte KI Code-Review...');
  console.log(`   Modell: ${OLLAMA_MODEL}`);
  console.log(`   Dateien: ${countFilesInDiff(diffContent)}`);

  try {
    const result = await reviewDiff(diffContent);

    console.log('\n📋 Review-Ergebnis:');
    console.log(`   Score: ${result.score}/100`);
    console.log(`   Issues: ${result.issues.length}`);

    // Ausgabe
    if (outputFile) {
      writeFileSync(outputFile, JSON.stringify(result, null, 2));
      console.log(`\n✅ Ergebnis gespeichert: ${outputFile}`);
    } else {
      console.log('\n' + JSON.stringify(result, null, 2));
    }

    // Exit-Code basierend auf kritischen Issues
    const hasCritical = result.issues.some(i => i.severity === 'critical');
    process.exit(hasCritical ? 1 : 0);

  } catch (error) {
    console.error('❌ Review fehlgeschlagen:', error);
    process.exit(1);
  }
}

main();
