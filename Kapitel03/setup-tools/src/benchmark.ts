/**
 * Ollama Benchmark Tool
 * Kapitel 3: Installation & Grundkonfiguration
 */

export interface BenchmarkResult {
  model: string;
  promptTokens: number;
  generatedTokens: number;
  promptDuration: number; // ms
  generateDuration: number; // ms
  promptSpeed: number; // tokens/sec
  generateSpeed: number; // tokens/sec
  firstTokenLatency: number; // ms
  totalDuration: number; // ms
}

export interface BenchmarkConfig {
  model: string;
  warmupRuns: number;
  testRuns: number;
  prompt: string;
  maxTokens: number;
}

const DEFAULT_CONFIG: BenchmarkConfig = {
  model: "phi3",
  warmupRuns: 1,
  testRuns: 3,
  prompt: "Zähle von 1 bis 20 und schreibe jede Zahl auf eine neue Zeile.",
  maxTokens: 100,
};

const OLLAMA_URL = process.env.OLLAMA_HOST || "http://localhost:11434";

/**
 * Führt Benchmark für ein Modell durch
 */
export async function runBenchmark(
  config: Partial<BenchmarkConfig> = {}
): Promise<BenchmarkResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  console.log(`\nBenchmark: ${cfg.model}`);
  console.log(`Prompt: "${cfg.prompt.slice(0, 50)}..."`);
  console.log(`Warmup: ${cfg.warmupRuns}, Tests: ${cfg.testRuns}`);
  console.log("");

  // Warmup
  if (cfg.warmupRuns > 0) {
    console.log("Warmup...");
    for (let i = 0; i < cfg.warmupRuns; i++) {
      await runSingleInference(cfg.model, "Sag OK.", 5);
    }
  }

  // Benchmark-Runs
  const results: BenchmarkResult[] = [];

  for (let i = 0; i < cfg.testRuns; i++) {
    console.log(`Run ${i + 1}/${cfg.testRuns}...`);
    const result = await runSingleBenchmark(cfg);
    results.push(result);
  }

  // Durchschnitt berechnen
  const avgResult = averageResults(results);
  avgResult.model = cfg.model;

  return avgResult;
}

async function runSingleBenchmark(
  config: BenchmarkConfig
): Promise<BenchmarkResult> {
  const startTime = Date.now();

  // First Token Latency messen
  const firstTokenStart = Date.now();
  let firstTokenLatency = 0;

  // Streaming für First-Token-Latency
  const streamResponse = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      prompt: config.prompt,
      stream: true,
      options: {
        num_predict: config.maxTokens,
      },
    }),
  });

  const reader = streamResponse.body?.getReader();
  if (reader) {
    const { value } = await reader.read();
    firstTokenLatency = Date.now() - firstTokenStart;
    reader.cancel();
  }

  // Vollständiger Run für Metriken
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      prompt: config.prompt,
      stream: false,
      options: {
        num_predict: config.maxTokens,
      },
    }),
  });

  const data = (await response.json()) as {
    prompt_eval_count?: number;
    eval_count?: number;
    prompt_eval_duration?: number;
    eval_duration?: number;
  };

  const totalDuration = Date.now() - startTime;

  const promptTokens = data.prompt_eval_count || 0;
  const generatedTokens = data.eval_count || 0;
  const promptDuration = (data.prompt_eval_duration || 0) / 1_000_000; // ns -> ms
  const generateDuration = (data.eval_duration || 0) / 1_000_000;

  return {
    model: config.model,
    promptTokens,
    generatedTokens,
    promptDuration,
    generateDuration,
    promptSpeed: promptDuration > 0 ? (promptTokens / promptDuration) * 1000 : 0,
    generateSpeed: generateDuration > 0 ? (generatedTokens / generateDuration) * 1000 : 0,
    firstTokenLatency,
    totalDuration,
  };
}

async function runSingleInference(
  model: string,
  prompt: string,
  maxTokens: number
): Promise<void> {
  await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { num_predict: maxTokens },
    }),
  });
}

function averageResults(results: BenchmarkResult[]): BenchmarkResult {
  const n = results.length;
  return {
    model: "",
    promptTokens: Math.round(results.reduce((s, r) => s + r.promptTokens, 0) / n),
    generatedTokens: Math.round(results.reduce((s, r) => s + r.generatedTokens, 0) / n),
    promptDuration: Math.round(results.reduce((s, r) => s + r.promptDuration, 0) / n),
    generateDuration: Math.round(results.reduce((s, r) => s + r.generateDuration, 0) / n),
    promptSpeed: Math.round(results.reduce((s, r) => s + r.promptSpeed, 0) / n * 10) / 10,
    generateSpeed: Math.round(results.reduce((s, r) => s + r.generateSpeed, 0) / n * 10) / 10,
    firstTokenLatency: Math.round(results.reduce((s, r) => s + r.firstTokenLatency, 0) / n),
    totalDuration: Math.round(results.reduce((s, r) => s + r.totalDuration, 0) / n),
  };
}

/**
 * Formatiert Benchmark-Ergebnis
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push("╔════════════════════════════════════════════╗");
  lines.push(`║  Benchmark-Ergebnis: ${result.model}`.padEnd(45) + "║");
  lines.push("╠════════════════════════════════════════════╣");
  lines.push(`║  Prompt-Verarbeitung:`.padEnd(45) + "║");
  lines.push(`║    Tokens: ${result.promptTokens}`.padEnd(45) + "║");
  lines.push(`║    Speed:  ${result.promptSpeed.toFixed(1)} tokens/sec`.padEnd(45) + "║");
  lines.push("╠════════════════════════════════════════════╣");
  lines.push(`║  Token-Generierung:`.padEnd(45) + "║");
  lines.push(`║    Tokens: ${result.generatedTokens}`.padEnd(45) + "║");
  lines.push(`║    Speed:  ${result.generateSpeed.toFixed(1)} tokens/sec`.padEnd(45) + "║");
  lines.push("╠════════════════════════════════════════════╣");
  lines.push(`║  Latenz:`.padEnd(45) + "║");
  lines.push(`║    First Token: ${result.firstTokenLatency}ms`.padEnd(45) + "║");
  lines.push(`║    Total:       ${result.totalDuration}ms`.padEnd(45) + "║");
  lines.push("╚════════════════════════════════════════════╝");

  // Bewertung
  lines.push("");
  if (result.generateSpeed >= 50) {
    lines.push("✓ Exzellent! GPU-beschleunigt.");
  } else if (result.generateSpeed >= 20) {
    lines.push("✓ Gut. Flüssige Interaktion möglich.");
  } else if (result.generateSpeed >= 10) {
    lines.push("! Akzeptabel. Für Batch-Verarbeitung geeignet.");
  } else {
    lines.push("✗ Langsam. Prüfen Sie GPU-Nutzung.");
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Benchmark mehrere Modelle
 */
export async function benchmarkMultipleModels(
  models: string[]
): Promise<Map<string, BenchmarkResult>> {
  const results = new Map<string, BenchmarkResult>();

  for (const model of models) {
    try {
      const result = await runBenchmark({ model, testRuns: 2, warmupRuns: 1 });
      results.set(model, result);
    } catch (error) {
      console.log(`Fehler bei ${model}: ${error}`);
    }
  }

  return results;
}

/**
 * Vergleichstabelle für mehrere Modelle
 */
export function formatComparisonTable(
  results: Map<string, BenchmarkResult>
): string {
  const lines: string[] = [];

  lines.push("");
  lines.push("┌────────────────────────┬──────────┬──────────┬──────────┐");
  lines.push("│ Modell                 │ Gen t/s  │ Prompt   │ Latenz   │");
  lines.push("├────────────────────────┼──────────┼──────────┼──────────┤");

  for (const [model, result] of results) {
    const modelName = model.slice(0, 22).padEnd(22);
    const genSpeed = result.generateSpeed.toFixed(1).padStart(6);
    const promptSpeed = result.promptSpeed.toFixed(1).padStart(6);
    const latency = (result.firstTokenLatency + "ms").padStart(6);
    lines.push(`│ ${modelName} │ ${genSpeed} │ ${promptSpeed} │ ${latency} │`);
  }

  lines.push("└────────────────────────┴──────────┴──────────┴──────────┘");
  lines.push("");

  return lines.join("\n");
}

// CLI Entry Point
async function main() {
  const model = process.argv[2] || "phi3";

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║          Ollama Benchmark Tool             ║");
  console.log("║          Kapitel 3 - Setup Tools           ║");
  console.log("╚════════════════════════════════════════════╝");

  // Prüfen ob Ollama erreichbar
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) throw new Error("Server nicht erreichbar");
  } catch {
    console.log("\nFehler: Ollama Server nicht erreichbar");
    console.log("Starten mit: ollama serve");
    process.exit(1);
  }

  const result = await runBenchmark({ model, testRuns: 3, warmupRuns: 1 });
  console.log(formatBenchmarkResult(result));
}

// Nur ausführen wenn direkt aufgerufen
if (process.argv[1]?.includes("benchmark")) {
  main().catch(console.error);
}
