/**
 * Ollama Setup Tools - Hauptmodul
 * Kapitel 3: Installation & Grundkonfiguration
 */

export {
  getSystemInfo,
  formatSystemInfo,
  getModelRecommendations,
  SystemInfo,
  GpuInfo,
  OllamaInfo,
} from "./system-info.js";

export {
  runHealthChecks,
  formatHealthStatus,
  HealthStatus,
  HealthCheck,
} from "./health-check.js";

export {
  runBenchmark,
  formatBenchmarkResult,
  benchmarkMultipleModels,
  formatComparisonTable,
  BenchmarkResult,
  BenchmarkConfig,
} from "./benchmark.js";
