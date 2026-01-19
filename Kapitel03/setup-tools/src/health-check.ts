/**
 * Ollama Health Check
 * Kapitel 3: Installation & Grundkonfiguration
 */

export interface HealthStatus {
  healthy: boolean;
  checks: HealthCheck[];
  timestamp: Date;
}

export interface HealthCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  duration?: number;
}

const OLLAMA_URL = process.env.OLLAMA_HOST || "http://localhost:11434";

/**
 * Führt alle Health Checks durch
 */
export async function runHealthChecks(): Promise<HealthStatus> {
  const checks: HealthCheck[] = [];

  // 1. Server erreichbar
  checks.push(await checkServerConnection());

  // 2. API funktioniert
  if (checks[0].status === "pass") {
    checks.push(await checkApiEndpoints());
  }

  // 3. Modelle vorhanden
  if (checks[0].status === "pass") {
    checks.push(await checkModelsAvailable());
  }

  // 4. Inference funktioniert
  if (checks.every((c) => c.status !== "fail")) {
    checks.push(await checkInference());
  }

  const healthy = checks.every((c) => c.status !== "fail");

  return {
    healthy,
    checks,
    timestamp: new Date(),
  };
}

async function checkServerConnection(): Promise<HealthCheck> {
  const start = Date.now();
  const name = "Server-Verbindung";

  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return {
        name,
        status: "pass",
        message: `Verbunden mit ${OLLAMA_URL}`,
        duration: Date.now() - start,
      };
    } else {
      return {
        name,
        status: "fail",
        message: `HTTP ${response.status}: ${response.statusText}`,
        duration: Date.now() - start,
      };
    }
  } catch (error) {
    return {
      name,
      status: "fail",
      message: `Nicht erreichbar: ${error}`,
      duration: Date.now() - start,
    };
  }
}

async function checkApiEndpoints(): Promise<HealthCheck> {
  const start = Date.now();
  const name = "API-Endpunkte";

  const endpoints = ["/api/tags", "/api/ps", "/api/version"];
  const failed: string[] = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${OLLAMA_URL}${endpoint}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) {
        failed.push(endpoint);
      }
    } catch {
      failed.push(endpoint);
    }
  }

  if (failed.length === 0) {
    return {
      name,
      status: "pass",
      message: `Alle ${endpoints.length} Endpunkte erreichbar`,
      duration: Date.now() - start,
    };
  } else if (failed.length < endpoints.length) {
    return {
      name,
      status: "warn",
      message: `${failed.length} Endpunkte fehlerhaft: ${failed.join(", ")}`,
      duration: Date.now() - start,
    };
  } else {
    return {
      name,
      status: "fail",
      message: "Keine Endpunkte erreichbar",
      duration: Date.now() - start,
    };
  }
}

async function checkModelsAvailable(): Promise<HealthCheck> {
  const start = Date.now();
  const name = "Installierte Modelle";

  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = (await response.json()) as { models: Array<{ name: string }> };

    if (data.models && data.models.length > 0) {
      return {
        name,
        status: "pass",
        message: `${data.models.length} Modell(e) installiert`,
        duration: Date.now() - start,
      };
    } else {
      return {
        name,
        status: "warn",
        message: "Keine Modelle installiert. Führen Sie 'ollama pull' aus.",
        duration: Date.now() - start,
      };
    }
  } catch (error) {
    return {
      name,
      status: "fail",
      message: `Fehler: ${error}`,
      duration: Date.now() - start,
    };
  }
}

async function checkInference(): Promise<HealthCheck> {
  const start = Date.now();
  const name = "Inference-Test";

  try {
    // Erst verfügbare Modelle holen
    const tagsResponse = await fetch(`${OLLAMA_URL}/api/tags`);
    const tagsData = (await tagsResponse.json()) as {
      models: Array<{ name: string }>;
    };

    if (!tagsData.models || tagsData.models.length === 0) {
      return {
        name,
        status: "warn",
        message: "Kein Modell für Test verfügbar",
        duration: Date.now() - start,
      };
    }

    // Erstes Modell für Test verwenden
    const testModel = tagsData.models[0].name;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: testModel,
        prompt: "Sag OK.",
        stream: false,
        options: {
          num_predict: 5,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
      const data = (await response.json()) as { response: string };
      return {
        name,
        status: "pass",
        message: `Inference erfolgreich (${testModel})`,
        duration: Date.now() - start,
      };
    } else {
      return {
        name,
        status: "fail",
        message: `HTTP ${response.status}`,
        duration: Date.now() - start,
      };
    }
  } catch (error) {
    return {
      name,
      status: "fail",
      message: `Inference fehlgeschlagen: ${error}`,
      duration: Date.now() - start,
    };
  }
}

/**
 * Formatiert Health Status für Ausgabe
 */
export function formatHealthStatus(status: HealthStatus): string {
  const lines: string[] = [];

  lines.push("");
  lines.push("╔════════════════════════════════════════════╗");
  lines.push("║          Ollama Health Check               ║");
  lines.push("╠════════════════════════════════════════════╣");

  for (const check of status.checks) {
    const icon =
      check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "✗";
    const statusText =
      check.status === "pass"
        ? "OK"
        : check.status === "warn"
          ? "WARN"
          : "FAIL";

    lines.push(`║ ${icon} ${check.name.padEnd(20)} [${statusText}]`.padEnd(45) + "║");
    lines.push(`║   ${check.message.slice(0, 40)}`.padEnd(45) + "║");
    if (check.duration) {
      lines.push(`║   (${check.duration}ms)`.padEnd(45) + "║");
    }
  }

  lines.push("╠════════════════════════════════════════════╣");

  const overallStatus = status.healthy ? "GESUND" : "PROBLEME";
  const overallIcon = status.healthy ? "✓" : "✗";
  lines.push(`║ ${overallIcon} Gesamtstatus: ${overallStatus}`.padEnd(45) + "║");

  lines.push("╚════════════════════════════════════════════╝");
  lines.push("");

  return lines.join("\n");
}

// CLI Entry Point
async function main() {
  console.log("\nFühre Health Checks durch...\n");

  const status = await runHealthChecks();
  console.log(formatHealthStatus(status));

  if (!status.healthy) {
    console.log("Troubleshooting:");
    console.log("  1. Prüfen Sie ob Ollama läuft: ollama serve");
    console.log("  2. Prüfen Sie OLLAMA_HOST: echo $OLLAMA_HOST");
    console.log("  3. Logs prüfen: journalctl -u ollama -f (Linux)");
    console.log("");
    process.exit(1);
  }
}

// Nur ausführen wenn direkt aufgerufen
if (process.argv[1]?.includes("health-check")) {
  main().catch(console.error);
}
