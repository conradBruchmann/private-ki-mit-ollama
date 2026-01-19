/**
 * System-Informationen für Ollama
 * Kapitel 3: Installation & Grundkonfiguration
 */

import { execSync } from "child_process";
import os from "os";

export interface SystemInfo {
  os: {
    platform: string;
    release: string;
    arch: string;
    hostname: string;
  };
  cpu: {
    model: string;
    cores: number;
    speed: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    percentUsed: number;
  };
  gpu: GpuInfo | null;
  ollama: OllamaInfo | null;
}

export interface GpuInfo {
  type: "nvidia" | "amd" | "apple" | "none";
  name: string;
  vram?: number;
  driver?: string;
}

export interface OllamaInfo {
  version: string;
  running: boolean;
  host: string;
  models: string[];
}

/**
 * Sammelt alle System-Informationen
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  const osInfo = getOsInfo();
  const cpuInfo = getCpuInfo();
  const memoryInfo = getMemoryInfo();
  const gpuInfo = await getGpuInfo();
  const ollamaInfo = await getOllamaInfo();

  return {
    os: osInfo,
    cpu: cpuInfo,
    memory: memoryInfo,
    gpu: gpuInfo,
    ollama: ollamaInfo,
  };
}

function getOsInfo() {
  return {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
  };
}

function getCpuInfo() {
  const cpus = os.cpus();
  return {
    model: cpus[0]?.model || "Unknown",
    cores: cpus.length,
    speed: cpus[0]?.speed || 0,
  };
}

function getMemoryInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;

  return {
    total: Math.round(total / 1024 / 1024 / 1024), // GB
    free: Math.round(free / 1024 / 1024 / 1024),
    used: Math.round(used / 1024 / 1024 / 1024),
    percentUsed: Math.round((used / total) * 100),
  };
}

async function getGpuInfo(): Promise<GpuInfo | null> {
  // NVIDIA GPU
  try {
    const output = execSync(
      "nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader",
      { encoding: "utf-8", timeout: 5000 }
    );
    const [name, vram, driver] = output.trim().split(", ");
    return {
      type: "nvidia",
      name: name.trim(),
      vram: parseInt(vram),
      driver: driver.trim(),
    };
  } catch {
    // Keine NVIDIA GPU
  }

  // AMD ROCm
  try {
    execSync("rocm-smi --showproductname", { encoding: "utf-8", timeout: 5000 });
    return {
      type: "amd",
      name: "AMD GPU (ROCm)",
    };
  } catch {
    // Keine AMD GPU
  }

  // Apple Silicon
  if (os.platform() === "darwin" && os.arch() === "arm64") {
    try {
      const chip = execSync("sysctl -n machdep.cpu.brand_string", {
        encoding: "utf-8",
      }).trim();
      return {
        type: "apple",
        name: chip || "Apple Silicon",
      };
    } catch {
      return {
        type: "apple",
        name: "Apple Silicon",
      };
    }
  }

  return null;
}

async function getOllamaInfo(): Promise<OllamaInfo | null> {
  // Version
  let version = "unknown";
  try {
    version = execSync("ollama --version", { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }

  // Server-Status und Modelle
  const host = process.env.OLLAMA_HOST || "http://localhost:11434";
  let running = false;
  let models: string[] = [];

  try {
    const response = await fetch(`${host}/api/tags`);
    if (response.ok) {
      running = true;
      const data = (await response.json()) as { models: Array<{ name: string }> };
      models = data.models.map((m) => m.name);
    }
  } catch {
    // Server nicht erreichbar
  }

  return {
    version,
    running,
    host,
    models,
  };
}

/**
 * Gibt Modell-Empfehlungen basierend auf System
 */
export function getModelRecommendations(info: SystemInfo): string[] {
  const ramGB = info.memory.total;
  const hasGpu = info.gpu !== null;
  const isAppleSilicon = info.gpu?.type === "apple";
  const vram = info.gpu?.vram || 0;

  const recommendations: string[] = [];

  // Basierend auf RAM
  if (ramGB >= 64 || (isAppleSilicon && ramGB >= 48)) {
    recommendations.push("llama3.3:70b-instruct-q4_K_M");
    recommendations.push("qwen2.5:32b");
  }

  if (ramGB >= 32 || vram >= 24) {
    recommendations.push("qwen2.5-coder:14b");
    recommendations.push("llama3.2:latest");
    recommendations.push("deepseek-coder-v2");
  }

  if (ramGB >= 16 || vram >= 8) {
    recommendations.push("llama3.2:8b");
    recommendations.push("mistral:latest");
    recommendations.push("codellama:7b");
  }

  // Immer kleine Modelle empfehlen
  recommendations.push("phi3:latest");
  recommendations.push("llama3.2:3b");

  return [...new Set(recommendations)]; // Deduplizieren
}

/**
 * Formatiert System-Info für Ausgabe
 */
export function formatSystemInfo(info: SystemInfo): string {
  const lines: string[] = [];

  lines.push("╔════════════════════════════════════════════╗");
  lines.push("║          System-Informationen              ║");
  lines.push("╠════════════════════════════════════════════╣");

  // OS
  lines.push(`║ OS:     ${info.os.platform} ${info.os.arch}`.padEnd(45) + "║");
  lines.push(`║ Host:   ${info.os.hostname}`.padEnd(45) + "║");

  // CPU
  lines.push("╠════════════════════════════════════════════╣");
  lines.push(`║ CPU:    ${info.cpu.cores} Cores @ ${info.cpu.speed}MHz`.padEnd(45) + "║");
  lines.push(`║         ${info.cpu.model.slice(0, 35)}`.padEnd(45) + "║");

  // Memory
  lines.push("╠════════════════════════════════════════════╣");
  lines.push(`║ RAM:    ${info.memory.total}GB total`.padEnd(45) + "║");
  lines.push(`║         ${info.memory.free}GB frei (${100 - info.memory.percentUsed}%)`.padEnd(45) + "║");

  // GPU
  lines.push("╠════════════════════════════════════════════╣");
  if (info.gpu) {
    lines.push(`║ GPU:    ${info.gpu.name.slice(0, 35)}`.padEnd(45) + "║");
    if (info.gpu.vram) {
      lines.push(`║         ${info.gpu.vram}MB VRAM`.padEnd(45) + "║");
    }
    if (info.gpu.driver) {
      lines.push(`║         Driver: ${info.gpu.driver}`.padEnd(45) + "║");
    }
  } else {
    lines.push("║ GPU:    Keine dedizierte GPU erkannt       ║");
  }

  // Ollama
  lines.push("╠════════════════════════════════════════════╣");
  if (info.ollama) {
    lines.push(`║ Ollama: ${info.ollama.version.slice(0, 30)}`.padEnd(45) + "║");
    lines.push(`║ Server: ${info.ollama.running ? "Läuft" : "Gestoppt"}`.padEnd(45) + "║");
    lines.push(`║ Modelle: ${info.ollama.models.length}`.padEnd(45) + "║");
  } else {
    lines.push("║ Ollama: Nicht installiert                  ║");
  }

  lines.push("╚════════════════════════════════════════════╝");

  return lines.join("\n");
}

// CLI Entry Point
async function main() {
  console.log("\nSammle System-Informationen...\n");

  const info = await getSystemInfo();
  console.log(formatSystemInfo(info));

  console.log("\nEmpfohlene Modelle für Ihr System:");
  const recommendations = getModelRecommendations(info);
  for (const model of recommendations.slice(0, 5)) {
    console.log(`  - ${model}`);
  }
  console.log();
}

// Nur ausführen wenn direkt aufgerufen
if (process.argv[1]?.includes("system-info")) {
  main().catch(console.error);
}
