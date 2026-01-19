#!/usr/bin/env node
/**
 * Code-Assistent CLI
 * Kapitel 7: Code-Assistent mit Ollama
 *
 * Verwendung:
 *   npx tsx src/cli.ts explain myfile.ts
 *   npx tsx src/cli.ts generate "Eine Funktion, die..." --lang python
 *   npx tsx src/cli.ts test myfile.ts --output tests/
 *   npx tsx src/cli.ts refactor myfile.ts
 *   npx tsx src/cli.ts document myfile.ts
 *   npx tsx src/cli.ts fix myfile.ts --context "TypeError: ..."
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { CodeAssistantService } from './lib/code-assistant/service.js';
import {
  CodeOperation,
  ProgrammingLanguage,
  detectLanguage,
  CODE_MODELS,
} from './lib/code-assistant/types.js';

const program = new Command();

program
  .name('code-assist')
  .description('Code-Assistent CLI - Lokaler KI-Copilot mit Ollama')
  .version('1.0.0');

// Gemeinsame Optionen
const commonOptions = (cmd: Command) =>
  cmd
    .option('-m, --model <model>', 'Ollama Modell', 'qwen2.5-coder:14b-instruct')
    .option('-l, --lang <language>', 'Programmiersprache')
    .option('-c, --context <context>', 'Zusätzlicher Kontext')
    .option('-o, --output <file>', 'Ergebnis in Datei speichern')
    .option('--no-stream', 'Streaming deaktivieren');

// Explain Command
commonOptions(
  program
    .command('explain <file>')
    .description('Code erklären')
)
  .action(async (file, options) => {
    await executeFileOperation('explain', file, options);
  });

// Generate Command
commonOptions(
  program
    .command('generate <prompt>')
    .description('Code generieren')
)
  .action(async (prompt, options) => {
    await executeGenerateOperation(prompt, options);
  });

// Test Command
commonOptions(
  program
    .command('test <file>')
    .description('Tests für Code schreiben')
)
  .action(async (file, options) => {
    await executeFileOperation('test', file, options);
  });

// Refactor Command
commonOptions(
  program
    .command('refactor <file>')
    .description('Code refactoren')
)
  .action(async (file, options) => {
    await executeFileOperation('refactor', file, options);
  });

// Document Command
commonOptions(
  program
    .command('document <file>')
    .description('Code dokumentieren')
)
  .action(async (file, options) => {
    await executeFileOperation('document', file, options);
  });

// Fix Command
commonOptions(
  program
    .command('fix <file>')
    .description('Bugs im Code finden und beheben')
)
  .action(async (file, options) => {
    await executeFileOperation('fix', file, options);
  });

// Complete Command
commonOptions(
  program
    .command('complete <file>')
    .description('Unvollständigen Code vervollständigen')
)
  .action(async (file, options) => {
    await executeFileOperation('complete', file, options);
  });

// Models Command
program
  .command('models')
  .description('Verfügbare Code-Modelle anzeigen')
  .action(async () => {
    const spinner = ora('Prüfe installierte Modelle...').start();

    try {
      const service = new CodeAssistantService();
      const installed = await service.listAvailableModels();

      spinner.stop();

      console.log(chalk.bold('\n📦 Empfohlene Code-Modelle:\n'));

      for (const model of CODE_MODELS) {
        const isInstalled = installed.some(
          (m) => m === model.name || m.startsWith(model.name.split(':')[0])
        );
        const status = isInstalled
          ? chalk.green('✓ Installiert')
          : chalk.gray('○ Nicht installiert');
        const rec = model.recommended ? chalk.yellow(' ★') : '';

        console.log(
          `  ${status}  ${chalk.cyan(model.displayName)}${rec}`
        );
        console.log(
          chalk.gray(`           ${model.name} (${model.contextLength} tokens)`)
        );
      }

      if (installed.length > 0) {
        console.log(chalk.bold('\n🔧 Installierte Code-Modelle:\n'));
        for (const model of installed) {
          console.log(`  ${chalk.green('•')} ${model}`);
        }
      }

      console.log(
        chalk.gray('\n💡 Tipp: ollama pull <model> zum Installieren\n')
      );
    } catch (error) {
      spinner.fail('Fehler beim Abrufen der Modelle');
      console.error(chalk.red(error));
    }
  });

// Interactive Command
program
  .command('interactive')
  .alias('i')
  .description('Interaktiver Modus')
  .option('-m, --model <model>', 'Ollama Modell', 'qwen2.5-coder:14b-instruct')
  .action(async (options) => {
    console.log(chalk.bold.cyan('\n🤖 Code-Assistent Interaktiver Modus\n'));
    console.log(chalk.gray('Befehle: explain, generate, test, refactor, document, fix, complete, quit\n'));

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt: string): Promise<string> =>
      new Promise((resolve) => rl.question(prompt, resolve));

    const service = new CodeAssistantService({ model: options.model });

    while (true) {
      const cmd = await question(chalk.cyan('> '));

      if (cmd === 'quit' || cmd === 'exit' || cmd === 'q') {
        console.log(chalk.gray('\nAuf Wiedersehen!\n'));
        rl.close();
        break;
      }

      const parts = cmd.split(' ');
      const operation = parts[0] as CodeOperation;

      if (!['explain', 'generate', 'test', 'refactor', 'document', 'fix', 'complete'].includes(operation)) {
        console.log(chalk.yellow('Unbekannter Befehl. Verfügbar: explain, generate, test, refactor, document, fix, complete, quit'));
        continue;
      }

      let code = '';
      let prompt = '';

      if (operation === 'generate') {
        prompt = await question(chalk.gray('Prompt: '));
      } else {
        console.log(chalk.gray('Code eingeben (leere Zeile zum Beenden):'));
        while (true) {
          const line = await question('');
          if (line === '') break;
          code += line + '\n';
        }
      }

      const lang = (await question(chalk.gray('Sprache [typescript]: '))) || 'typescript';

      const spinner = ora('Verarbeite...').start();

      try {
        let result = '';
        for await (const chunk of service.stream({
          operation,
          code: code || undefined,
          prompt: prompt || undefined,
          language: lang as ProgrammingLanguage,
        })) {
          result += chunk;
        }

        spinner.stop();
        console.log(chalk.green('\n--- Ergebnis ---\n'));
        console.log(result);
        console.log(chalk.green('\n--- Ende ---\n'));
      } catch (error) {
        spinner.fail('Fehler');
        console.error(chalk.red(error));
      }
    }
  });

async function executeFileOperation(
  operation: CodeOperation,
  file: string,
  options: {
    model?: string;
    lang?: string;
    context?: string;
    output?: string;
    stream?: boolean;
  }
) {
  const filePath = path.resolve(file);

  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`Datei nicht gefunden: ${filePath}`));
    process.exit(1);
  }

  const code = fs.readFileSync(filePath, 'utf-8');
  const language = (options.lang ||
    detectLanguage(file)) as ProgrammingLanguage;

  console.log(
    chalk.cyan(`\n📄 ${path.basename(file)} (${language})\n`)
  );

  const spinner = ora(`${getOperationLabel(operation)}...`).start();

  try {
    const service = new CodeAssistantService({ model: options.model });

    let result = '';

    if (options.stream !== false) {
      spinner.stop();
      process.stdout.write(chalk.gray(''));

      for await (const chunk of service.stream({
        operation,
        code,
        language,
        context: options.context,
      })) {
        process.stdout.write(chunk);
        result += chunk;
      }

      console.log('\n');
    } else {
      const response = await service.execute({
        operation,
        code,
        language,
        context: options.context,
      });

      spinner.stop();
      result = response.result;
      console.log(result);
      console.log(
        chalk.gray(
          `\n⏱️  ${response.duration}ms | 🔤 ${response.tokens} tokens\n`
        )
      );
    }

    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, extractCode(result) || result);
      console.log(chalk.green(`✓ Gespeichert: ${outputPath}`));
    }
  } catch (error) {
    spinner.fail('Fehler');
    console.error(chalk.red(error));
    process.exit(1);
  }
}

async function executeGenerateOperation(
  prompt: string,
  options: {
    model?: string;
    lang?: string;
    context?: string;
    output?: string;
    stream?: boolean;
  }
) {
  const language = (options.lang || 'typescript') as ProgrammingLanguage;

  console.log(chalk.cyan(`\n✨ Generiere ${language} Code...\n`));

  const spinner = ora('Generiere...').start();

  try {
    const service = new CodeAssistantService({ model: options.model });

    let result = '';

    if (options.stream !== false) {
      spinner.stop();

      for await (const chunk of service.stream({
        operation: 'generate',
        prompt,
        language,
        context: options.context,
      })) {
        process.stdout.write(chunk);
        result += chunk;
      }

      console.log('\n');
    } else {
      const response = await service.execute({
        operation: 'generate',
        prompt,
        language,
        context: options.context,
      });

      spinner.stop();
      result = response.result;
      console.log(result);
      console.log(
        chalk.gray(
          `\n⏱️  ${response.duration}ms | 🔤 ${response.tokens} tokens\n`
        )
      );
    }

    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, extractCode(result) || result);
      console.log(chalk.green(`✓ Gespeichert: ${outputPath}`));
    }
  } catch (error) {
    spinner.fail('Fehler');
    console.error(chalk.red(error));
    process.exit(1);
  }
}

function getOperationLabel(operation: CodeOperation): string {
  const labels: Record<CodeOperation, string> = {
    explain: 'Analysiere',
    generate: 'Generiere',
    test: 'Schreibe Tests',
    refactor: 'Refactore',
    document: 'Dokumentiere',
    fix: 'Analysiere Bugs',
    complete: 'Vervollständige',
  };
  return labels[operation];
}

function extractCode(text: string): string | null {
  const match = text.match(/```[\w]*\n?([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

program.parse();
