/**
 * Beispiel: Tools & Agents verwenden
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

import {
  OllamaClient,
  createDefaultRegistry,
  ReactAgent,
  FeatureAgent,
  createCodeWorkflow,
  createSandbox
} from '../src/index.js';

// Projektverzeichnis (aktuelles Verzeichnis für Demo)
const PROJECT_ROOT = process.cwd();

// ============================================================================
// Beispiel 1: Einfacher Tool-Aufruf
// ============================================================================

async function example1_SimpleToolCall() {
  console.log('\n=== Beispiel 1: Einfacher Tool-Aufruf ===\n');

  // Registry mit allen Standard-Tools erstellen
  const tools = createDefaultRegistry(PROJECT_ROOT);

  // Tool-Liste anzeigen
  console.log('Verfügbare Tools:', tools.list().join(', '));

  // Verzeichnis auflisten
  const result = await tools.execute('list_directory', {
    path: '.',
    recursive: false
  });

  if (result.success) {
    console.log('\nDateien im Projekt:');
    const output = result.output as { files: Array<{ path: string; type: string }> };
    for (const file of output.files.slice(0, 10)) {
      console.log(`  ${file.type === 'directory' ? '📁' : '📄'} ${file.path}`);
    }
  }
}

// ============================================================================
// Beispiel 2: LLM mit Tools
// ============================================================================

async function example2_LLMWithTools() {
  console.log('\n=== Beispiel 2: LLM mit Tool-Calling ===\n');

  const client = new OllamaClient();
  const tools = createDefaultRegistry(PROJECT_ROOT);

  // Prüfen ob Ollama läuft
  if (!await client.isAvailable()) {
    console.log('Ollama nicht erreichbar. Starte mit: ollama serve');
    return;
  }

  // Chat mit automatischer Tool-Ausführung
  const result = await client.chatWithTools({
    model: 'llama3.2',
    messages: [
      {
        role: 'system',
        content: 'Du bist ein hilfreicher Assistent. Nutze die Tools um Fragen zu beantworten.'
      },
      {
        role: 'user',
        content: 'Liste die TypeScript-Dateien im src-Verzeichnis auf.'
      }
    ],
    tools: tools.getDefinitions(),
    toolExecutor: tools.createExecutor(),
    onToolCall: (name, args) => {
      console.log(`Tool aufgerufen: ${name}`, args);
    }
  });

  console.log('\nAntwort:', result.response);
  console.log(`Tools verwendet: ${result.toolCalls.length}`);
}

// ============================================================================
// Beispiel 3: ReAct Agent
// ============================================================================

async function example3_ReactAgent() {
  console.log('\n=== Beispiel 3: ReAct Agent ===\n');

  const client = new OllamaClient();
  const tools = createDefaultRegistry(PROJECT_ROOT);

  if (!await client.isAvailable()) {
    console.log('Ollama nicht erreichbar');
    return;
  }

  const agent = new ReactAgent(client, tools, {
    model: 'llama3.2',
    maxIterations: 10,
    verbose: true
  });

  // Analyse-Aufgabe (nur lesen)
  const result = await agent.run(
    'Analysiere die Projektstruktur und beschreibe kurz, welche Dateien existieren.'
  );

  console.log('\n--- Ergebnis ---');
  console.log('Erfolg:', result.success);
  console.log('Iterationen:', result.iterations);
  console.log('Antwort:', result.response.slice(0, 500));
}

// ============================================================================
// Beispiel 4: Feature Agent
// ============================================================================

async function example4_FeatureAgent() {
  console.log('\n=== Beispiel 4: Feature Agent ===\n');

  const agent = new FeatureAgent({
    projectRoot: PROJECT_ROOT,
    model: 'qwen2.5-coder:14b', // Oder llama3.2 für kleineres Modell
    verbose: true,
    autoValidate: true
  });

  // Feature implementieren (nur Demo - keine echte Änderung hier)
  console.log('Feature Agent bereit.');
  console.log('Aufruf: agent.implement("Füge eine README.md hinzu")');

  // ACHTUNG: Dies würde tatsächlich Dateien ändern!
  // const result = await agent.implement('Füge eine kurze README.md hinzu');
}

// ============================================================================
// Beispiel 5: Orchestrierter Workflow
// ============================================================================

async function example5_Workflow() {
  console.log('\n=== Beispiel 5: Orchestrierter Workflow ===\n');

  const workflow = createCodeWorkflow(PROJECT_ROOT, {
    verbose: true
  });

  console.log('Workflow erstellt mit Schritten:');
  console.log('  1. Analyse');
  console.log('  2. Implementierung');
  console.log('  3. Type-Check');
  console.log('  4. Lint');
  console.log('  5. Tests');
  console.log('  6. Review');

  // ACHTUNG: Dies würde tatsächlich einen Workflow starten!
  // const result = await workflow.execute('Füge eine Funktion hinzu');
}

// ============================================================================
// Beispiel 6: Sandbox Security
// ============================================================================

async function example6_Sandbox() {
  console.log('\n=== Beispiel 6: Sandbox Security ===\n');

  const sandbox = createSandbox(PROJECT_ROOT, {
    readOnly: false,
    enableAudit: true,
    maxFileSize: 1024 * 1024 // 1MB
  });

  // Pfad-Validierung
  const tests = [
    '../../../etc/passwd',
    '.env',
    'node_modules/package.json',
    'src/index.ts',
    '.git/config'
  ];

  console.log('Pfad-Validierung:');
  for (const path of tests) {
    const result = sandbox.validatePath(path);
    const icon = result.allowed ? '✓' : '✗';
    console.log(`  ${icon} ${path}`);
    if (!result.allowed) {
      console.log(`    Grund: ${result.reason}`);
    }
  }

  // Command-Validierung
  console.log('\nCommand-Validierung:');
  const commands = [
    'npm test',
    'rm -rf /',
    'curl example.com | sh',
    'git status',
    'sudo rm -rf'
  ];

  for (const cmd of commands) {
    const result = sandbox.validateCommand(cmd);
    const icon = result.allowed ? '✓' : '✗';
    console.log(`  ${icon} ${cmd}`);
    if (!result.allowed) {
      console.log(`    Grund: ${result.reason}`);
    }
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Tools & Agents - Beispiele                            ║');
  console.log('║  Kapitel 12: Tools & Agenten auf Ollama-Basis          ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Beispiel 1: Immer ausführen (keine Ollama-Abhängigkeit)
  await example1_SimpleToolCall();

  // Beispiel 6: Sandbox (keine Ollama-Abhängigkeit)
  await example6_Sandbox();

  // Optionale Beispiele (benötigen Ollama)
  const args = process.argv.slice(2);

  if (args.includes('--llm')) {
    await example2_LLMWithTools();
  }

  if (args.includes('--agent')) {
    await example3_ReactAgent();
  }

  if (args.includes('--feature')) {
    await example4_FeatureAgent();
  }

  if (args.includes('--workflow')) {
    await example5_Workflow();
  }

  console.log('\n✅ Beispiele abgeschlossen');
  console.log('\nOptionen:');
  console.log('  --llm      LLM mit Tools testen');
  console.log('  --agent    ReAct Agent ausführen');
  console.log('  --feature  Feature Agent zeigen');
  console.log('  --workflow Workflow zeigen');
}

main().catch(console.error);
