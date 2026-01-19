#!/usr/bin/env npx tsx
/**
 * TCO-Rechner: Lokal vs. Cloud
 * Kapitel 16: Kostenmodelle & Cloud-Vergleich
 *
 * Vergleicht die Gesamtkosten (Total Cost of Ownership) von:
 * - Lokalen LLMs mit Ollama
 * - Cloud-APIs (OpenAI, Anthropic, etc.)
 *
 * Verwendung:
 *   npx tsx tco-calculator.ts
 *   npx tsx tco-calculator.ts --interactive
 */

// =============================================================================
// Typen
// =============================================================================

interface HardwareConfig {
  name: string;
  description: string;
  purchasePrice: number;  // EUR
  powerWatts: number;     // Watt
  lifespan: number;       // Jahre
  vram: number;           // GB
  maxModelSize: string;   // z.B. "7B", "14B", "70B"
}

interface CloudPricing {
  provider: string;
  model: string;
  inputPer1M: number;   // EUR pro 1M Input-Tokens
  outputPer1M: number;  // EUR pro 1M Output-Tokens
}

interface UsageProfile {
  name: string;
  description: string;
  tokensPerMonth: number;      // Durchschnittliche Tokens/Monat
  inputOutputRatio: number;    // Input:Output Verhältnis (z.B. 3:1 = 0.75)
  peakHoursPerDay: number;     // Stunden mit aktiver Nutzung
  growthPerYear: number;       // Wachstum in % pro Jahr
}

interface TCOResult {
  hardware: {
    purchase: number;
    electricity: number;
    maintenance: number;
    total: number;
    perMonth: number;
  };
  cloud: {
    monthly: number;
    yearly: number;
    total: number;
  };
  breakEven: {
    months: number;
    reached: boolean;
  };
  savings: {
    afterYear1: number;
    afterYear3: number;
    afterYear5: number;
    percent3Year: number;
  };
}

// =============================================================================
// Konfigurationen
// =============================================================================

const HARDWARE_OPTIONS: HardwareConfig[] = [
  {
    name: 'Mac Mini M4 Pro',
    description: 'Apple Silicon, 24GB Unified Memory',
    purchasePrice: 2000,
    powerWatts: 65,
    lifespan: 5,
    vram: 24,
    maxModelSize: '14B'
  },
  {
    name: 'Mac Studio M2 Ultra',
    description: 'Apple Silicon, 128GB Unified Memory',
    purchasePrice: 5000,
    powerWatts: 120,
    lifespan: 5,
    vram: 128,
    maxModelSize: '70B'
  },
  {
    name: 'Gaming PC RTX 4090',
    description: 'NVIDIA RTX 4090 24GB',
    purchasePrice: 3000,
    powerWatts: 450,
    lifespan: 4,
    vram: 24,
    maxModelSize: '14B'
  },
  {
    name: 'Workstation 2x RTX 4090',
    description: 'Dual NVIDIA RTX 4090, 48GB total',
    purchasePrice: 6000,
    powerWatts: 800,
    lifespan: 4,
    vram: 48,
    maxModelSize: '30B'
  },
  {
    name: 'Server NVIDIA A100',
    description: 'NVIDIA A100 80GB',
    purchasePrice: 15000,
    powerWatts: 400,
    lifespan: 5,
    vram: 80,
    maxModelSize: '70B'
  }
];

const CLOUD_PRICING: CloudPricing[] = [
  { provider: 'OpenAI', model: 'GPT-4o', inputPer1M: 2.50, outputPer1M: 10.00 },
  { provider: 'OpenAI', model: 'GPT-4o-mini', inputPer1M: 0.15, outputPer1M: 0.60 },
  { provider: 'OpenAI', model: 'GPT-4-Turbo', inputPer1M: 10.00, outputPer1M: 30.00 },
  { provider: 'Anthropic', model: 'Claude 3.5 Sonnet', inputPer1M: 3.00, outputPer1M: 15.00 },
  { provider: 'Anthropic', model: 'Claude 3 Haiku', inputPer1M: 0.25, outputPer1M: 1.25 },
  { provider: 'Google', model: 'Gemini 1.5 Pro', inputPer1M: 1.25, outputPer1M: 5.00 },
  { provider: 'Mistral', model: 'Mistral Large', inputPer1M: 2.00, outputPer1M: 6.00 }
];

const USAGE_PROFILES: UsageProfile[] = [
  {
    name: 'Einzelentwickler',
    description: 'Coding Assistant, gelegentliche Nutzung',
    tokensPerMonth: 5_000_000,
    inputOutputRatio: 0.7,
    peakHoursPerDay: 4,
    growthPerYear: 0.2
  },
  {
    name: 'Kleines Team',
    description: '5-10 Entwickler, tägliche Nutzung',
    tokensPerMonth: 50_000_000,
    inputOutputRatio: 0.65,
    peakHoursPerDay: 8,
    growthPerYear: 0.3
  },
  {
    name: 'Startup',
    description: 'Produkt mit KI-Features, moderate Last',
    tokensPerMonth: 200_000_000,
    inputOutputRatio: 0.6,
    peakHoursPerDay: 16,
    growthPerYear: 0.5
  },
  {
    name: 'Enterprise',
    description: 'Hohe Last, 24/7 Betrieb',
    tokensPerMonth: 1_000_000_000,
    inputOutputRatio: 0.55,
    peakHoursPerDay: 24,
    growthPerYear: 0.4
  }
];

// =============================================================================
// Konstanten
// =============================================================================

const ELECTRICITY_PRICE_KWH = 0.35;  // EUR/kWh (Deutschland 2024)
const HOURS_PER_MONTH = 730;         // ~30.4 Tage
const MAINTENANCE_PERCENT = 0.05;    // 5% der Hardware pro Jahr

// =============================================================================
// Berechnungen
// =============================================================================

function calculateTCO(
  hardware: HardwareConfig,
  cloud: CloudPricing,
  usage: UsageProfile,
  years: number = 3
): TCOResult {
  // --- Hardware-Kosten ---
  const purchaseCost = hardware.purchasePrice;

  // Stromkosten
  const activeHours = usage.peakHoursPerDay * 30; // pro Monat
  const idleHours = HOURS_PER_MONTH - activeHours;
  const activeWatts = hardware.powerWatts;
  const idleWatts = hardware.powerWatts * 0.3; // 30% im Idle

  const monthlyKwh = (activeHours * activeWatts + idleHours * idleWatts) / 1000;
  const yearlyElectricity = monthlyKwh * 12 * ELECTRICITY_PRICE_KWH;
  const totalElectricity = yearlyElectricity * years;

  // Wartung (5% pro Jahr)
  const yearlyMaintenance = purchaseCost * MAINTENANCE_PERCENT;
  const totalMaintenance = yearlyMaintenance * years;

  const hardwareTotal = purchaseCost + totalElectricity + totalMaintenance;
  const hardwarePerMonth = hardwareTotal / (years * 12);

  // --- Cloud-Kosten ---
  let totalCloudCost = 0;
  let currentTokens = usage.tokensPerMonth;

  for (let month = 0; month < years * 12; month++) {
    const inputTokens = currentTokens * usage.inputOutputRatio;
    const outputTokens = currentTokens * (1 - usage.inputOutputRatio);

    const monthlyCost =
      (inputTokens / 1_000_000) * cloud.inputPer1M +
      (outputTokens / 1_000_000) * cloud.outputPer1M;

    totalCloudCost += monthlyCost;

    // Jährliches Wachstum
    if ((month + 1) % 12 === 0) {
      currentTokens *= (1 + usage.growthPerYear);
    }
  }

  const cloudMonthly = totalCloudCost / (years * 12);

  // --- Break-Even ---
  let cumulativeCloud = 0;
  let cumulativeHardware = purchaseCost;
  let breakEvenMonth = -1;
  currentTokens = usage.tokensPerMonth;

  for (let month = 1; month <= years * 12; month++) {
    const inputTokens = currentTokens * usage.inputOutputRatio;
    const outputTokens = currentTokens * (1 - usage.inputOutputRatio);

    const monthlyCloud =
      (inputTokens / 1_000_000) * cloud.inputPer1M +
      (outputTokens / 1_000_000) * cloud.outputPer1M;

    cumulativeCloud += monthlyCloud;
    cumulativeHardware += (yearlyElectricity + yearlyMaintenance) / 12;

    if (cumulativeCloud >= cumulativeHardware && breakEvenMonth === -1) {
      breakEvenMonth = month;
    }

    if ((month) % 12 === 0) {
      currentTokens *= (1 + usage.growthPerYear);
    }
  }

  // --- Einsparungen ---
  const after1Year = calculateCloudCostForPeriod(cloud, usage, 1) -
    (purchaseCost + yearlyElectricity + yearlyMaintenance);

  const after3Years = calculateCloudCostForPeriod(cloud, usage, 3) - hardwareTotal;

  const after5Years = calculateCloudCostForPeriod(cloud, usage, 5) -
    (purchaseCost + yearlyElectricity * 5 + yearlyMaintenance * 5);

  const cloudCost3Year = calculateCloudCostForPeriod(cloud, usage, 3);
  const savingsPercent = cloudCost3Year > 0
    ? ((cloudCost3Year - hardwareTotal) / cloudCost3Year) * 100
    : 0;

  return {
    hardware: {
      purchase: purchaseCost,
      electricity: totalElectricity,
      maintenance: totalMaintenance,
      total: hardwareTotal,
      perMonth: hardwarePerMonth
    },
    cloud: {
      monthly: cloudMonthly,
      yearly: cloudMonthly * 12,
      total: totalCloudCost
    },
    breakEven: {
      months: breakEvenMonth,
      reached: breakEvenMonth > 0 && breakEvenMonth <= years * 12
    },
    savings: {
      afterYear1: after1Year,
      afterYear3: after3Years,
      afterYear5: after5Years,
      percent3Year: savingsPercent
    }
  };
}

function calculateCloudCostForPeriod(
  cloud: CloudPricing,
  usage: UsageProfile,
  years: number
): number {
  let total = 0;
  let currentTokens = usage.tokensPerMonth;

  for (let month = 0; month < years * 12; month++) {
    const inputTokens = currentTokens * usage.inputOutputRatio;
    const outputTokens = currentTokens * (1 - usage.inputOutputRatio);

    total +=
      (inputTokens / 1_000_000) * cloud.inputPer1M +
      (outputTokens / 1_000_000) * cloud.outputPer1M;

    if ((month + 1) % 12 === 0) {
      currentTokens *= (1 + usage.growthPerYear);
    }
  }

  return total;
}

// =============================================================================
// Formatierung
// =============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('de-DE').format(num);
}

// =============================================================================
// Report
// =============================================================================

function printReport(
  hardware: HardwareConfig,
  cloud: CloudPricing,
  usage: UsageProfile,
  result: TCOResult
): void {
  console.log('\n' + '═'.repeat(70));
  console.log('TCO-ANALYSE: Lokal vs. Cloud');
  console.log('═'.repeat(70));

  console.log('\n📊 KONFIGURATION');
  console.log('─'.repeat(70));
  console.log(`Hardware:     ${hardware.name}`);
  console.log(`              ${hardware.description}`);
  console.log(`Cloud:        ${cloud.provider} ${cloud.model}`);
  console.log(`Nutzung:      ${usage.name}`);
  console.log(`              ${usage.description}`);
  console.log(`Tokens/Monat: ${formatNumber(usage.tokensPerMonth)}`);

  console.log('\n💰 KOSTEN ÜBER 3 JAHRE');
  console.log('─'.repeat(70));

  console.log('\nLOKAL (Ollama):');
  console.log(`  Hardware-Anschaffung:  ${formatCurrency(result.hardware.purchase)}`);
  console.log(`  Stromkosten:           ${formatCurrency(result.hardware.electricity)}`);
  console.log(`  Wartung:               ${formatCurrency(result.hardware.maintenance)}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  GESAMT:                ${formatCurrency(result.hardware.total)}`);
  console.log(`  Pro Monat:             ${formatCurrency(result.hardware.perMonth)}`);

  console.log('\nCLOUD:');
  console.log(`  Pro Monat:             ${formatCurrency(result.cloud.monthly)}`);
  console.log(`  Pro Jahr:              ${formatCurrency(result.cloud.yearly)}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  GESAMT (3 Jahre):      ${formatCurrency(result.cloud.total)}`);

  console.log('\n📈 ANALYSE');
  console.log('─'.repeat(70));

  if (result.breakEven.reached) {
    console.log(`✅ Break-Even nach:      ${result.breakEven.months} Monaten`);
  } else if (result.breakEven.months === -1) {
    console.log(`❌ Break-Even:           Nicht erreicht (Cloud günstiger)`);
  }

  console.log(`\nEinsparung nach 1 Jahr:  ${formatCurrency(result.savings.afterYear1)}`);
  console.log(`Einsparung nach 3 Jahren: ${formatCurrency(result.savings.afterYear3)}`);
  console.log(`Einsparung nach 5 Jahren: ${formatCurrency(result.savings.afterYear5)}`);

  if (result.savings.percent3Year > 0) {
    console.log(`\n💡 Lokal spart ${result.savings.percent3Year.toFixed(0)}% über 3 Jahre`);
  } else {
    console.log(`\n💡 Cloud ist ${Math.abs(result.savings.percent3Year).toFixed(0)}% günstiger über 3 Jahre`);
  }

  console.log('\n' + '═'.repeat(70));
}

// =============================================================================
// Übersichts-Tabelle
// =============================================================================

function printComparisonTable(usage: UsageProfile): void {
  console.log('\n' + '═'.repeat(90));
  console.log(`ÜBERSICHT: ${usage.name} (${formatNumber(usage.tokensPerMonth)} Tokens/Monat)`);
  console.log('═'.repeat(90));

  console.log('\n┌─────────────────────────┬────────────┬────────────────┬─────────────┬──────────┐');
  console.log('│ Konfiguration           │ Lokal 3J   │ Cloud 3J       │ Ersparnis   │ Break-   │');
  console.log('│                         │            │ (GPT-4o-mini)  │             │ Even     │');
  console.log('├─────────────────────────┼────────────┼────────────────┼─────────────┼──────────┤');

  const cloudRef = CLOUD_PRICING.find(c => c.model === 'GPT-4o-mini')!;

  for (const hw of HARDWARE_OPTIONS) {
    const result = calculateTCO(hw, cloudRef, usage, 3);

    const localStr = formatCurrency(result.hardware.total).padStart(10);
    const cloudStr = formatCurrency(result.cloud.total).padStart(14);
    const savingsStr = formatCurrency(result.savings.afterYear3).padStart(11);
    const breakEvenStr = result.breakEven.reached
      ? `${result.breakEven.months}M`.padStart(8)
      : '   n/a  ';

    console.log(`│ ${hw.name.padEnd(23)} │ ${localStr} │ ${cloudStr} │ ${savingsStr} │ ${breakEvenStr} │`);
  }

  console.log('└─────────────────────────┴────────────┴────────────────┴─────────────┴──────────┘');
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  TCO-Rechner: Lokal vs. Cloud                                    ║');
  console.log('║  Kapitel 16: Kostenmodelle & Cloud-Vergleich                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  // Alle Usage-Profile durchgehen
  for (const usage of USAGE_PROFILES) {
    printComparisonTable(usage);
  }

  // Detail-Report für ein Beispiel
  const exampleHardware = HARDWARE_OPTIONS[0]; // Mac Mini M4 Pro
  const exampleCloud = CLOUD_PRICING[1];       // GPT-4o-mini
  const exampleUsage = USAGE_PROFILES[1];      // Kleines Team

  const result = calculateTCO(exampleHardware, exampleCloud, exampleUsage, 3);
  printReport(exampleHardware, exampleCloud, exampleUsage, result);

  console.log('\n📝 HINWEISE:');
  console.log('─'.repeat(70));
  console.log('• Strompreis: 0.35 EUR/kWh (Deutschland 2024)');
  console.log('• Cloud-Preise: Stand Januar 2024, können variieren');
  console.log('• Lokal: Keine API-Kosten, unbegrenzte Nutzung');
  console.log('• Cloud: Flexibler, aber laufende Kosten');
  console.log('• Nicht berücksichtigt: Personalkosten, Latenz, Datenschutz');
}

main().catch(console.error);
