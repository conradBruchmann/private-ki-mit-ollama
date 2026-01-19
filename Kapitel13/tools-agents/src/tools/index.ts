/**
 * Tools - Export und Default Registry
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

// Types
export * from './types.js';

// Registry
export * from './registry.js';

// File Tools
export {
  ReadFileTool,
  WriteFileTool,
  PatchFileTool,
  DeleteFileTool,
  createFileTools
} from './file-tools.js';

// Advanced File Tools
export {
  ListDirectoryTool,
  SearchCodeTool,
  FindReplaceTool,
  createAdvancedFileTools
} from './advanced-file-tools.js';

// Git Tools
export {
  GitStatusTool,
  GitDiffTool,
  GitCommitTool,
  GitBranchTool,
  GitLogTool,
  createGitTools
} from './git-tools.js';

// Build Tools
export {
  RunTestsTool,
  TypeCheckTool,
  LintTool,
  RunCommandTool,
  createBuildTools
} from './build-tools.js';

// ============================================================================
// Default Registry Factory
// ============================================================================

import { ToolRegistry } from './registry.js';
import { createFileTools } from './file-tools.js';
import { createAdvancedFileTools } from './advanced-file-tools.js';
import { createGitTools } from './git-tools.js';
import { createBuildTools } from './build-tools.js';

/**
 * Erstellt eine Registry mit allen Standard-Tools
 */
export function createDefaultRegistry(projectRoot: string): ToolRegistry {
  const registry = new ToolRegistry();

  // File Tools
  registry.registerAll(createFileTools(projectRoot), 'filesystem');

  // Advanced File Tools
  registry.registerAll(createAdvancedFileTools(projectRoot), 'analysis');

  // Git Tools
  registry.registerAll(createGitTools(projectRoot), 'git');

  // Build Tools
  registry.registerAll(createBuildTools(projectRoot), 'build');

  return registry;
}

/**
 * Erstellt eine eingeschränkte Registry (nur Lese-Tools)
 */
export function createReadOnlyRegistry(projectRoot: string): ToolRegistry {
  const registry = new ToolRegistry();

  // Nur Lese-Tools
  const { ReadFileTool } = require('./file-tools.js');
  const { ListDirectoryTool, SearchCodeTool } = require('./advanced-file-tools.js');
  const { GitStatusTool, GitDiffTool, GitLogTool } = require('./git-tools.js');

  registry.register(new ReadFileTool(projectRoot), 'filesystem');
  registry.register(new ListDirectoryTool(projectRoot), 'filesystem');
  registry.register(new SearchCodeTool(projectRoot), 'analysis');
  registry.register(new GitStatusTool(projectRoot), 'git');
  registry.register(new GitDiffTool(projectRoot), 'git');
  registry.register(new GitLogTool(projectRoot), 'git');

  return registry;
}

/**
 * Erstellt eine Registry nur für Code-Analyse
 */
export function createAnalysisRegistry(projectRoot: string): ToolRegistry {
  const registry = new ToolRegistry();

  const { ReadFileTool } = require('./file-tools.js');
  const { ListDirectoryTool, SearchCodeTool } = require('./advanced-file-tools.js');
  const { TypeCheckTool, LintTool } = require('./build-tools.js');

  registry.register(new ReadFileTool(projectRoot), 'filesystem');
  registry.register(new ListDirectoryTool(projectRoot), 'filesystem');
  registry.register(new SearchCodeTool(projectRoot), 'analysis');
  registry.register(new TypeCheckTool(projectRoot), 'build');
  registry.register(new LintTool(projectRoot), 'build');

  return registry;
}
