/**
 * Prompt-Templates für Code-Operationen
 * Kapitel 7: Code-Assistent mit Ollama
 */

import { CodeOperation, ProgrammingLanguage, FileContext } from './types.js';

const LANGUAGE_HINTS: Record<ProgrammingLanguage, string> = {
  typescript:
    'Use TypeScript with strict types. Prefer interfaces over types where appropriate.',
  javascript: 'Use modern ES6+ JavaScript. Avoid var, use const/let.',
  python: 'Use Python 3.10+ features. Include type hints.',
  rust: 'Use idiomatic Rust. Handle errors with Result<T, E>.',
  go: 'Use idiomatic Go. Handle errors explicitly.',
  java: 'Use Java 17+ features. Follow clean code principles.',
  csharp: 'Use C# 11+ features. Use nullable reference types.',
  cpp: 'Use modern C++17/20. Prefer smart pointers.',
  shell: 'Use bash with proper error handling. Quote variables.',
  sql: 'Use standard SQL. Avoid vendor-specific extensions where possible.',
};

const TEST_FRAMEWORKS: Record<ProgrammingLanguage, string> = {
  typescript: 'Jest or Vitest',
  javascript: 'Jest or Vitest',
  python: 'pytest',
  rust: 'built-in #[test]',
  go: 'built-in testing package',
  java: 'JUnit 5',
  csharp: 'xUnit or NUnit',
  cpp: 'Google Test or Catch2',
  shell: 'bats-core',
  sql: 'pgTAP or utPLSQL',
};

const DOC_STYLES: Record<ProgrammingLanguage, string> = {
  typescript: 'TSDoc/JSDoc',
  javascript: 'JSDoc',
  python: 'Google-style docstrings',
  rust: 'rustdoc (///)',
  go: 'GoDoc',
  java: 'Javadoc',
  csharp: 'XML documentation',
  cpp: 'Doxygen',
  shell: 'Inline comments with function headers',
  sql: 'SQL comments (-- or /* */)',
};

export function buildPrompt(
  operation: CodeOperation,
  code: string | undefined,
  prompt: string | undefined,
  language: ProgrammingLanguage,
  context?: string,
  files?: FileContext[]
): string {
  const languageHint = LANGUAGE_HINTS[language];
  const fileContext = files ? buildFileContext(files) : '';

  switch (operation) {
    case 'explain':
      return buildExplainPrompt(code!, language, context, fileContext);
    case 'generate':
      return buildGeneratePrompt(prompt!, language, languageHint, context, fileContext);
    case 'test':
      return buildTestPrompt(code!, language, context, fileContext);
    case 'refactor':
      return buildRefactorPrompt(code!, language, context, fileContext);
    case 'document':
      return buildDocumentPrompt(code!, language, context, fileContext);
    case 'fix':
      return buildFixPrompt(code!, language, context, fileContext);
    case 'complete':
      return buildCompletePrompt(code!, language, context, fileContext);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

function buildFileContext(files: FileContext[]): string {
  if (files.length === 0) return '';

  const parts = files.map(
    (f) => `### ${f.path}\n\`\`\`${f.language || 'text'}\n${f.content}\n\`\`\``
  );

  return `\n\nRELATED FILES:\n${parts.join('\n\n')}`;
}

function buildExplainPrompt(
  code: string,
  language: ProgrammingLanguage,
  context?: string,
  fileContext?: string
): string {
  return `Explain the following ${language} code in detail.

${context ? `Context: ${context}\n\n` : ''}CODE:
\`\`\`${language}
${code}
\`\`\`
${fileContext || ''}

Provide:
1. A brief summary (1-2 sentences)
2. Step-by-step explanation of what the code does
3. Any potential issues or edge cases
4. Suggestions for improvement (if any)

Use clear, concise language. Explain technical terms if needed.`;
}

function buildGeneratePrompt(
  prompt: string,
  language: ProgrammingLanguage,
  languageHint: string,
  context?: string,
  fileContext?: string
): string {
  return `Generate ${language} code for the following requirement:

${prompt}

${context ? `Context: ${context}\n\n` : ''}${fileContext || ''}

REQUIREMENTS:
- ${languageHint}
- Write clean, readable code
- Include brief comments for complex logic
- Handle edge cases appropriately

Respond with ONLY the code, no explanations. Wrap in \`\`\`${language} code blocks.`;
}

function buildTestPrompt(
  code: string,
  language: ProgrammingLanguage,
  context?: string,
  fileContext?: string
): string {
  const testFramework = TEST_FRAMEWORKS[language];

  return `Write comprehensive unit tests for the following ${language} code.

${context ? `Context: ${context}\n\n` : ''}CODE TO TEST:
\`\`\`${language}
${code}
\`\`\`
${fileContext || ''}

REQUIREMENTS:
- Use ${testFramework}
- Cover happy path and edge cases
- Test error handling
- Use descriptive test names
- Include at least 3-5 test cases

Respond with ONLY the test code, no explanations.`;
}

function buildRefactorPrompt(
  code: string,
  language: ProgrammingLanguage,
  context?: string,
  fileContext?: string
): string {
  return `Refactor the following ${language} code to improve quality.

${context ? `Context: ${context}\n\n` : ''}ORIGINAL CODE:
\`\`\`${language}
${code}
\`\`\`
${fileContext || ''}

Focus on:
1. Readability and maintainability
2. Performance optimizations
3. Following ${language} best practices
4. Removing code duplication
5. Improving naming

Provide:
1. The refactored code
2. A brief explanation of changes made

Keep the same functionality. Don't add new features.`;
}

function buildDocumentPrompt(
  code: string,
  language: ProgrammingLanguage,
  context?: string,
  fileContext?: string
): string {
  const docStyle = DOC_STYLES[language];

  return `Add documentation to the following ${language} code.

${context ? `Context: ${context}\n\n` : ''}CODE:
\`\`\`${language}
${code}
\`\`\`
${fileContext || ''}

REQUIREMENTS:
- Use ${docStyle} documentation style
- Document all public functions/methods
- Include parameter descriptions
- Include return value descriptions
- Add usage examples where helpful

Return the complete code with documentation added.`;
}

function buildFixPrompt(
  code: string,
  language: ProgrammingLanguage,
  context?: string,
  fileContext?: string
): string {
  return `Analyze the following ${language} code for bugs and issues.

${context ? `Context/Error: ${context}\n\n` : ''}CODE:
\`\`\`${language}
${code}
\`\`\`
${fileContext || ''}

Provide:
1. List of identified issues (bugs, potential problems)
2. Fixed code with corrections
3. Explanation of each fix

If no bugs are found, suggest potential improvements.`;
}

function buildCompletePrompt(
  code: string,
  language: ProgrammingLanguage,
  context?: string,
  fileContext?: string
): string {
  const languageHint = LANGUAGE_HINTS[language];

  return `Complete the following ${language} code. The code may have placeholders like TODO, ..., or be incomplete.

${context ? `Context: ${context}\n\n` : ''}INCOMPLETE CODE:
\`\`\`${language}
${code}
\`\`\`
${fileContext || ''}

REQUIREMENTS:
- ${languageHint}
- Complete all TODOs and placeholders
- Maintain consistent style with existing code
- Add error handling where appropriate

Return ONLY the completed code, no explanations.`;
}

export function getSystemPrompt(operation: CodeOperation): string {
  const prompts: Record<CodeOperation, string> = {
    explain: `You are an expert code explainer. Break down code clearly and thoroughly.
Focus on the "why" not just the "what". Use simple language.`,

    generate: `You are an expert programmer. Write clean, efficient, production-ready code.
Follow best practices and conventions for the given language.
Only output code, no explanations unless asked.`,

    test: `You are a testing expert. Write comprehensive, meaningful tests.
Cover edge cases, error conditions, and happy paths.
Use descriptive test names that explain the expected behavior.`,

    refactor: `You are a code quality expert. Improve code without changing functionality.
Focus on readability, maintainability, and performance.
Explain your changes briefly.`,

    document: `You are a documentation expert. Write clear, helpful documentation.
Document the "why" as much as the "what".
Include examples where helpful.`,

    fix: `You are a debugging expert. Find and fix bugs systematically.
Explain root causes clearly. Verify fixes don't introduce new issues.`,

    complete: `You are an expert programmer. Complete partial code intelligently.
Maintain consistent style. Add proper error handling.
Only output the completed code.`,
  };

  return prompts[operation];
}

export function getTemperature(operation: CodeOperation): number {
  const temperatures: Record<CodeOperation, number> = {
    explain: 0.3,
    generate: 0.4,
    test: 0.3,
    refactor: 0.2,
    document: 0.3,
    fix: 0.2,
    complete: 0.3,
  };
  return temperatures[operation];
}
