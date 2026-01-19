#!/usr/bin/env node
/**
 * CLI für Tools & Agents
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'path';

import { OllamaClient } from './llm/ollama-client.js';
import { createDefaultRegistry } from './tools/index.js';
import { ReactAgent, FeatureAgent } from './agents/index.js';
import { createCodeWorkflow } from './workflows/index.js';
import { createSandbox } from './security/index.js';

// ============================================================================
// CLI Setup
// ============================================================================

const program = new Command();

program
  .name('tools-agent')
  .description('Tool-basierte KI-Agenten auf Ollama-Basis')
  .version('1.0.0');

// ============================================================================
// Agent Command
// ============================================================================

program
  .command('agent')
  .description('ReAct-Agent für autonome Aufgaben')
  .argument('<task>', 'Die auszuführende Aufgabe')
  .option('-p, --project <path>', 'Projektverzeichnis', '.')
  .option('-m, --model <name>', 'LLM-Modell', 'llama3.2')
  .option('-u, --url <url>', 'Ollama URL', 'http://localhost:11434')
  .option('-i, --iterations <n>', 'Max Iterationen', '15')
  .option('-v, --verbose', 'Ausführliche Ausgabe', false)
  .option('-s, --sandbox', 'Sandbox-Modus aktivieren', false)
  .action(async (task, options) => {
    const projectRoot = resolve(options.project);

    console.log(chalk.bold('\n🤖 ReAct Agent'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(chalk.cyan('Projekt:'), projectRoot);
    console.log(chalk.cyan('Modell:'), options.model);
    console.log(chalk.cyan('Aufgabe:'), task);
    console.log(chalk.gray('━'.repeat(50)) + '\n');

    // Ollama prüfen
    const client = new OllamaClient(options.url, options.model);
    const spinner = ora('Prüfe Ollama-Verbindung...').start();

    const available = await client.isAvailable();
    if (!available) {
      spinner.fail('Ollama nicht erreichbar');
      console.log(chalk.yellow('\nStarte Ollama mit: ollama serve'));
      process.exit(1);
    }
    spinner.succeed('Ollama verbunden');

    // Tools vorbereiten
    let tools = createDefaultRegistry(projectRoot);

    // Sandbox anwenden
    if (options.sandbox) {
      const sandbox = createSandbox(projectRoot, { enableAudit: true });
      sandbox.wrapRegistry(tools);
      console.log(chalk.yellow('🔒 Sandbox-Modus aktiv\n'));
    }

    // Agent erstellen
    const agent = new ReactAgent(client, tools, {
      model: options.model,
      maxIterations: parseInt(options.iterations),
      verbose: options.verbose
    });

    // Agent ausführen
    const startTime = Date.now();

    try {
      const result = await agent.run(task, {
        onIteration: (i) => {
          if (!options.verbose) {
            process.stdout.write(chalk.gray(`Iteration ${i}... `));
          }
        },
        onToolCall: (name, args) => {
          if (!options.verbose) {
            process.stdout.write(chalk.blue(`[${name}] `));
          }
        },
        onToolResult: (name, result) => {
          if (!options.verbose) {
            process.stdout.write(result.success ? chalk.green('✓ ') : chalk.red('✗ '));
          }
        }
      });

      console.log('\n\n' + chalk.gray('━'.repeat(50)));

      if (result.success) {
        console.log(chalk.green.bold('✓ Aufgabe erledigt'));
        console.log(chalk.gray(`Iterationen: ${result.iterations}`));
        console.log(chalk.gray(`Dauer: ${((Date.now() - startTime) / 1000).toFixed(1)}s`));
        console.log('\n' + chalk.bold('Ergebnis:'));
        console.log(result.response);
      } else {
        console.log(chalk.red.bold('✗ Aufgabe fehlgeschlagen'));
        console.log(chalk.red(result.error || 'Unbekannter Fehler'));
      }

    } catch (error) {
      console.log(chalk.red.bold('\n✗ Agent-Fehler:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// Feature Command
// ============================================================================

program
  .command('feature')
  .description('Feature-Agent für Entwicklungsaufgaben')
  .argument('<description>', 'Feature-Beschreibung')
  .option('-p, --project <path>', 'Projektverzeichnis', '.')
  .option('-m, --model <name>', 'LLM-Modell', 'qwen2.5-coder:14b')
  .option('-u, --url <url>', 'Ollama URL', 'http://localhost:11434')
  .option('-v, --verbose', 'Ausführliche Ausgabe', true)
  .action(async (description, options) => {
    const projectRoot = resolve(options.project);

    console.log(chalk.bold('\n🚀 Feature Agent'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(chalk.cyan('Feature:'), description);
    console.log(chalk.cyan('Projekt:'), projectRoot);
    console.log(chalk.gray('━'.repeat(50)) + '\n');

    const agent = new FeatureAgent({
      projectRoot,
      model: options.model,
      ollamaUrl: options.url,
      verbose: options.verbose
    });

    try {
      const result = await agent.implement(description);

      console.log('\n' + chalk.gray('━'.repeat(50)));

      if (result.success) {
        console.log(chalk.green.bold('✓ Feature implementiert'));
        console.log('\n' + result.response);
      } else {
        console.log(chalk.red.bold('✗ Implementierung fehlgeschlagen'));
        console.log(chalk.red(result.error || 'Unbekannter Fehler'));
      }

    } catch (error) {
      console.log(chalk.red.bold('\n✗ Fehler:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// Workflow Command
// ============================================================================

program
  .command('workflow')
  .description('Orchestrierter Workflow für strukturierte Aufgaben')
  .argument('<task>', 'Die auszuführende Aufgabe')
  .option('-p, --project <path>', 'Projektverzeichnis', '.')
  .option('-u, --url <url>', 'Ollama URL', 'http://localhost:11434')
  .option('-v, --verbose', 'Ausführliche Ausgabe', false)
  .action(async (task, options) => {
    const projectRoot = resolve(options.project);

    console.log(chalk.bold('\n📋 Code Workflow'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(chalk.cyan('Aufgabe:'), task);
    console.log(chalk.cyan('Projekt:'), projectRoot);
    console.log(chalk.gray('━'.repeat(50)) + '\n');

    const workflow = createCodeWorkflow(projectRoot, {
      verbose: options.verbose,
      ollamaUrl: options.url
    });

    try {
      const result = await workflow.execute(task);

      console.log('\n' + chalk.gray('━'.repeat(50)));

      if (result.success) {
        console.log(chalk.green.bold('✓ Workflow abgeschlossen'));

        console.log('\n' + chalk.bold('Steps:'));
        for (const step of result.steps) {
          const icon = step.success ? chalk.green('✓') : chalk.red('✗');
          console.log(`  ${icon} ${step.step} (${(step.duration / 1000).toFixed(1)}s)`);
        }

        console.log(chalk.gray(`\nGesamtdauer: ${(result.totalDuration / 1000).toFixed(1)}s`));
      } else {
        console.log(chalk.red.bold('✗ Workflow fehlgeschlagen'));
        console.log(chalk.red(result.message));
      }

    } catch (error) {
      console.log(chalk.red.bold('\n✗ Workflow-Fehler:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// Tools Command
// ============================================================================

program
  .command('tools')
  .description('Verfügbare Tools auflisten')
  .option('-p, --project <path>', 'Projektverzeichnis', '.')
  .action((options) => {
    const projectRoot = resolve(options.project);
    const tools = createDefaultRegistry(projectRoot);

    console.log(chalk.bold('\n🔧 Verfügbare Tools'));
    console.log(chalk.gray('━'.repeat(50)) + '\n');

    const allTools = tools.getAll();

    const byCategory = new Map<string, typeof allTools>();
    for (const tool of allTools) {
      const cat = tool.category || 'other';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(tool);
    }

    for (const [category, categoryTools] of byCategory) {
      console.log(chalk.cyan.bold(category.toUpperCase()));
      for (const tool of categoryTools) {
        console.log(`  ${chalk.yellow(tool.name)}: ${tool.description}`);
      }
      console.log();
    }
  });

// ============================================================================
// Test Tool Command
// ============================================================================

program
  .command('test-tool')
  .description('Ein Tool direkt testen')
  .argument('<tool>', 'Tool-Name')
  .argument('[args]', 'Tool-Argumente als JSON')
  .option('-p, --project <path>', 'Projektverzeichnis', '.')
  .action(async (toolName, argsJson, options) => {
    const projectRoot = resolve(options.project);
    const tools = createDefaultRegistry(projectRoot);

    const tool = tools.get(toolName);
    if (!tool) {
      console.log(chalk.red(`Tool nicht gefunden: ${toolName}`));
      console.log(chalk.gray(`Verfügbar: ${tools.list().join(', ')}`));
      process.exit(1);
    }

    let args = {};
    if (argsJson) {
      try {
        args = JSON.parse(argsJson);
      } catch {
        console.log(chalk.red('Ungültiges JSON für Argumente'));
        process.exit(1);
      }
    }

    console.log(chalk.bold(`\nTool: ${toolName}`));
    console.log(chalk.gray('Args:'), args);
    console.log();

    const spinner = ora('Ausführen...').start();
    const result = await tools.execute(toolName, args);
    spinner.stop();

    if (result.success) {
      console.log(chalk.green('✓ Erfolg'));
      console.log(JSON.stringify(result.output, null, 2));
    } else {
      console.log(chalk.red('✗ Fehler'));
      console.log(result.error);
    }
  });

// ============================================================================
// Models Command
// ============================================================================

program
  .command('models')
  .description('Verfügbare Ollama-Modelle auflisten')
  .option('-u, --url <url>', 'Ollama URL', 'http://localhost:11434')
  .action(async (options) => {
    const client = new OllamaClient(options.url);

    const spinner = ora('Lade Modelle...').start();

    try {
      const models = await client.listModels();
      spinner.stop();

      console.log(chalk.bold('\n📚 Verfügbare Modelle'));
      console.log(chalk.gray('━'.repeat(50)) + '\n');

      if (models.length === 0) {
        console.log(chalk.yellow('Keine Modelle installiert'));
        console.log(chalk.gray('Installiere mit: ollama pull llama3.2'));
      } else {
        for (const model of models) {
          const sizeGB = (model.size / 1024 / 1024 / 1024).toFixed(1);
          console.log(`  ${chalk.cyan(model.name)} ${chalk.gray(`(${sizeGB}GB)`)}`);
        }
      }

    } catch (error) {
      spinner.fail('Fehler beim Laden der Modelle');
      console.log(chalk.red(String(error)));
      process.exit(1);
    }
  });

// ============================================================================
// Parse & Run
// ============================================================================

program.parse();
