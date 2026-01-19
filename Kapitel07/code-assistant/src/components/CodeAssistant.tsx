/**
 * Code-Assistent Hauptkomponente
 * Kapitel 7: Code-Assistent mit Ollama
 */

'use client';

import { useState } from 'react';
import { useCodeAssistant } from '@/hooks/useCodeAssistant';
import {
  CodeOperation,
  ProgrammingLanguage,
} from '@/lib/code-assistant/types';
import { CodeEditor } from './CodeEditor';
import { ResultPanel } from './ResultPanel';

const OPERATIONS: { value: CodeOperation; label: string; icon: string }[] = [
  { value: 'explain', label: 'Erklären', icon: '💡' },
  { value: 'generate', label: 'Generieren', icon: '✨' },
  { value: 'test', label: 'Tests', icon: '🧪' },
  { value: 'refactor', label: 'Refactoring', icon: '🔧' },
  { value: 'document', label: 'Dokumentieren', icon: '📝' },
  { value: 'fix', label: 'Bug finden', icon: '🐛' },
  { value: 'complete', label: 'Vervollständigen', icon: '🔮' },
];

const LANGUAGES: { value: ProgrammingLanguage; label: string }[] = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'shell', label: 'Shell' },
  { value: 'sql', label: 'SQL' },
];

export function CodeAssistant() {
  const [code, setCode] = useState('');
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState<ProgrammingLanguage>('typescript');
  const [operation, setOperation] = useState<CodeOperation>('explain');
  const [context, setContext] = useState('');

  const {
    result,
    isLoading,
    error,
    explain,
    generate,
    test,
    refactor,
    document,
    fix,
    complete,
    reset,
  } = useCodeAssistant();

  const handleSubmit = async () => {
    reset();

    try {
      switch (operation) {
        case 'explain':
          await explain(code, language, context);
          break;
        case 'generate':
          await generate(prompt, language, context);
          break;
        case 'test':
          await test(code, language, context);
          break;
        case 'refactor':
          await refactor(code, language, context);
          break;
        case 'document':
          await document(code, language, context);
          break;
        case 'fix':
          await fix(code, language, context);
          break;
        case 'complete':
          await complete(code, language, context);
          break;
      }
    } catch {
      // Error wird im State behandelt
    }
  };

  const needsCode = [
    'explain',
    'test',
    'refactor',
    'document',
    'fix',
    'complete',
  ].includes(operation);
  const needsPrompt = operation === 'generate';

  const canSubmit = needsCode ? code.trim() : needsPrompt ? prompt.trim() : true;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Code-Assistent</h1>
          <p className="text-gray-400 mt-2">
            Lokaler KI-Copilot mit Ollama
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-4">
            {/* Operation Selector */}
            <div className="flex flex-wrap gap-2">
              {OPERATIONS.map((op) => (
                <button
                  key={op.value}
                  onClick={() => setOperation(op.value)}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                    operation === op.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {op.icon} {op.label}
                </button>
              ))}
            </div>

            {/* Language Selector */}
            <div className="flex gap-4">
              <select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as ProgrammingLanguage)
                }
                className="flex-1 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Code Input */}
            {needsCode && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Code eingeben:
                </label>
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  placeholder="Fügen Sie hier Ihren Code ein..."
                />
              </div>
            )}

            {/* Prompt Input */}
            {needsPrompt && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Was soll generiert werden?
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="z.B. Eine Funktion, die zwei Arrays merged und Duplikate entfernt"
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800 rounded-lg border border-gray-700 resize-none focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Context (optional) */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Zusätzlicher Kontext (optional):
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="z.B. Error-Message oder spezielle Anforderungen"
                className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !canSubmit}
              className="w-full px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? 'Verarbeite...' : 'Ausführen'}
            </button>
          </div>

          {/* Output Panel */}
          <ResultPanel
            result={result}
            isLoading={isLoading}
            error={error}
            language={language}
          />
        </div>
      </div>
    </div>
  );
}
