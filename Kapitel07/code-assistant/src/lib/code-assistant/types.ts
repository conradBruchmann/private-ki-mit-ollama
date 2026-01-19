/**
 * Code-Assistent Typen
 * Kapitel 7: Code-Assistent mit Ollama
 */

export type CodeOperation =
  | 'explain'
  | 'generate'
  | 'test'
  | 'refactor'
  | 'document'
  | 'fix'
  | 'complete';

export type ProgrammingLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'go'
  | 'java'
  | 'csharp'
  | 'cpp'
  | 'shell'
  | 'sql';

export interface CodeRequest {
  operation: CodeOperation;
  code?: string;
  prompt?: string;
  language: ProgrammingLanguage;
  context?: string;
  files?: FileContext[];
}

export interface FileContext {
  path: string;
  content: string;
  language?: ProgrammingLanguage;
}

export interface CodeResponse {
  result: string;
  explanation?: string;
  tokens: number;
  duration: number;
  model: string;
}

export interface CodeExample {
  input: string;
  output: string;
  language: ProgrammingLanguage;
}

export interface ModelConfig {
  name: string;
  displayName: string;
  contextLength: number;
  recommended: boolean;
}

export const CODE_MODELS: ModelConfig[] = [
  {
    name: 'qwen2.5-coder:32b-instruct',
    displayName: 'Qwen 2.5 Coder 32B',
    contextLength: 32768,
    recommended: true,
  },
  {
    name: 'qwen2.5-coder:14b-instruct',
    displayName: 'Qwen 2.5 Coder 14B',
    contextLength: 32768,
    recommended: true,
  },
  {
    name: 'qwen2.5-coder:7b-instruct',
    displayName: 'Qwen 2.5 Coder 7B',
    contextLength: 32768,
    recommended: false,
  },
  {
    name: 'deepseek-coder-v2:16b',
    displayName: 'DeepSeek Coder V2 16B',
    contextLength: 16384,
    recommended: true,
  },
  {
    name: 'codellama:34b',
    displayName: 'CodeLlama 34B',
    contextLength: 16384,
    recommended: false,
  },
  {
    name: 'starcoder2:15b',
    displayName: 'StarCoder 2 15B',
    contextLength: 16384,
    recommended: false,
  },
];

export const LANGUAGE_EXTENSIONS: Record<string, ProgrammingLanguage> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.cs': 'csharp',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.c': 'cpp',
  '.h': 'cpp',
  '.sh': 'shell',
  '.bash': 'shell',
  '.sql': 'sql',
};

export function detectLanguage(filename: string): ProgrammingLanguage {
  const ext = filename.substring(filename.lastIndexOf('.'));
  return LANGUAGE_EXTENSIONS[ext] || 'typescript';
}
