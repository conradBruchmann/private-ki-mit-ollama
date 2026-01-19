#!/usr/bin/env node
/**
 * Ollama Setup Tools CLI
 * Kapitel 3: Installation & Grundkonfiguration
 */

import { Command } from "commander";
import { getSystemInfo, formatSystemInfo, getModelRecommendations } from "./system-info.js";
import { runHealthChecks, formatHealthStatus } from "./health-check.js";
import { runBenchmark, formatBenchmarkResult, benchmarkMultipleModels, formatComparisonTable } from "./benchmark.js";

const program = new Command();

program
  .name("ollama-tools")
  .description("Ollama Setup, Diagnose und Benchmark Tools - Kapitel 3")
  .version("1.0.0");

// Check Command
program
  .command("check")
  .description("Vollständiger System- und Ollama-Check")
  .action(async () => {
    console.log("\n╔════════════════════════════════════════════╗");
    console.log("║          Ollama System Check               ║");
    console.log("║          Kapitel 3 - Setup Tools           ║");
    console.log("╚════════════════════════════════════════════╝");

    // System Info
    console.log("\n1. System-Informationen sammeln...");
    const sysInfo = await getSystemInfo();
    console.log(formatSystemInfo(sysInfo));

    // Health Check
    console.log("\n2. Health Check durchführen...");
    const health = await runHealthChecks();
    console.log(formatHealthStatus(health));

    // Empfehlungen
    console.log("3. Modell-Empfehlungen:");
    const recommendations = getModelRecommendations(sysInfo);
    for (const model of recommendations.slice(0, 5)) {
      console.log(`   - ${model}`);
    }
    console.log();
  });

// Info Command
program
  .command("info")
  .description("System-Informationen anzeigen")
  .action(async () => {
    const info = await getSystemInfo();
    console.log(formatSystemInfo(info));

    console.log("\nModell-Empfehlungen:");
    const recommendations = getModelRecommendations(info);
    for (const model of recommendations.slice(0, 5)) {
      console.log(`  - ${model}`);
    }
    console.log();
  });

// Health Command
program
  .command("health")
  .description("Ollama Health Check")
  .action(async () => {
    const status = await runHealthChecks();
    console.log(formatHealthStatus(status));

    if (!status.healthy) {
      process.exit(1);
    }
  });

// Benchmark Command
program
  .command("benchmark [model]")
  .alias("bench")
  .description("Performance-Benchmark für ein Modell")
  .option("-r, --runs <n>", "Anzahl der Test-Runs", "3")
  .option("-w, --warmup <n>", "Anzahl der Warmup-Runs", "1")
  .option("-p, --prompt <text>", "Test-Prompt")
  .action(async (model, options) => {
    const modelName = model || "phi3";

    console.log("\n╔════════════════════════════════════════════╗");
    console.log("║          Ollama Benchmark                  ║");
    console.log("╚════════════════════════════════════════════╝");

    try {
      const result = await runBenchmark({
        model: modelName,
        testRuns: parseInt(options.runs),
        warmupRuns: parseInt(options.warmup),
        prompt: options.prompt,
      });

      console.log(formatBenchmarkResult(result));
    } catch (error) {
      console.error("\nFehler:", error);
      console.log("\nStellen Sie sicher, dass:");
      console.log("  1. Ollama läuft (ollama serve)");
      console.log(`  2. Das Modell installiert ist (ollama pull ${modelName})`);
      process.exit(1);
    }
  });

// Compare Command
program
  .command("compare <models...>")
  .description("Vergleiche mehrere Modelle")
  .action(async (models) => {
    console.log("\n╔════════════════════════════════════════════╗");
    console.log("║          Modell-Vergleich                  ║");
    console.log("╚════════════════════════════════════════════╝");

    console.log(`\nVergleiche: ${models.join(", ")}\n`);

    const results = await benchmarkMultipleModels(models);
    console.log(formatComparisonTable(results));
  });

// Models Command
program
  .command("models")
  .description("Installierte Modelle auflisten")
  .action(async () => {
    const url = process.env.OLLAMA_HOST || "http://localhost:11434";

    try {
      const response = await fetch(`${url}/api/tags`);
      const data = (await response.json()) as {
        models: Array<{ name: string; size: number; modified_at: string }>;
      };

      console.log("\nInstallierte Modelle:\n");

      if (data.models.length === 0) {
        console.log("  Keine Modelle installiert.");
        console.log("  Installieren mit: ollama pull <model>");
      } else {
        for (const model of data.models) {
          const sizeGB = (model.size / 1024 / 1024 / 1024).toFixed(1);
          const modified = new Date(model.modified_at).toLocaleDateString("de-DE");
          console.log(`  - ${model.name.padEnd(30)} ${sizeGB}GB  (${modified})`);
        }
      }
      console.log();
    } catch {
      console.log("\nFehler: Ollama nicht erreichbar");
      console.log("Starten mit: ollama serve");
    }
  });

// Running Command
program
  .command("running")
  .alias("ps")
  .description("Laufende Modelle anzeigen")
  .action(async () => {
    const url = process.env.OLLAMA_HOST || "http://localhost:11434";

    try {
      const response = await fetch(`${url}/api/ps`);
      const data = (await response.json()) as {
        models: Array<{
          name: string;
          size: number;
          size_vram: number;
          expires_at: string;
        }>;
      };

      console.log("\nLaufende Modelle:\n");

      if (!data.models || data.models.length === 0) {
        console.log("  Keine Modelle geladen.");
      } else {
        for (const model of data.models) {
          const sizeGB = (model.size / 1024 / 1024 / 1024).toFixed(1);
          const vramGB = (model.size_vram / 1024 / 1024 / 1024).toFixed(1);
          const expires = new Date(model.expires_at);
          const expiresIn = Math.round((expires.getTime() - Date.now()) / 1000 / 60);

          console.log(`  ${model.name}`);
          console.log(`    RAM: ${sizeGB}GB, VRAM: ${vramGB}GB`);
          console.log(`    Entladen in: ${expiresIn} Minuten`);
        }
      }
      console.log();
    } catch {
      console.log("\nFehler: Ollama nicht erreichbar");
    }
  });

program.parse();
