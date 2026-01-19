/**
 * Tools & Agents - Main Export
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

// LLM Client
export {
  OllamaClient,
  systemMessage,
  userMessage,
  assistantMessage,
  toolMessage,
  type ChatMessage,
  type ToolCall,
  type ChatResponse,
  type ExecutedToolCall,
  type ChatWithToolsResult,
  type ChatOptions
} from './llm/ollama-client.js';

// Tools
export {
  // Types
  BaseTool,
  createToolDefinition,
  successResult,
  errorResult,
  type Tool,
  type ToolDefinition,
  type ToolResult,
  type ToolParameters,
  type ToolProperty,
  type ToolCategory,
  type ToolMetadata,

  // Registry
  ToolRegistry,
  createRegistry,
  createDefaultRegistry,
  createReadOnlyRegistry,
  createAnalysisRegistry,

  // File Tools
  ReadFileTool,
  WriteFileTool,
  PatchFileTool,
  DeleteFileTool,
  createFileTools,

  // Advanced File Tools
  ListDirectoryTool,
  SearchCodeTool,
  FindReplaceTool,
  createAdvancedFileTools,

  // Git Tools
  GitStatusTool,
  GitDiffTool,
  GitCommitTool,
  GitBranchTool,
  GitLogTool,
  createGitTools,

  // Build Tools
  RunTestsTool,
  TypeCheckTool,
  LintTool,
  RunCommandTool,
  createBuildTools
} from './tools/index.js';

// Agents
export {
  ReactAgent,
  createAgent,
  createReadOnlyAgent,
  type ReactAgentConfig,
  type AgentResult,
  type AgentTrace,
  type AgentCallbacks,

  FeatureAgent,
  createFeature,
  fixBug,
  refactorCode,
  type FeatureAgentConfig
} from './agents/index.js';

// Workflows
export {
  CodeWorkflow,
  createCodeWorkflow,
  type WorkflowStep,
  type StepResult,
  type WorkflowResult,
  type WorkflowConfig
} from './workflows/index.js';

// Security
export {
  Sandbox,
  createSandbox,
  createStrictSandbox,
  createTestSandbox,
  type SandboxConfig,
  type ValidationResult,
  type AuditEntry
} from './security/index.js';
