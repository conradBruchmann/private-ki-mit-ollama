/**
 * Result Panel Komponente
 * Kapitel 7: Code-Assistent mit Ollama
 */

'use client';

import { useState } from 'react';
import { ProgrammingLanguage } from '@/lib/code-assistant/types';

interface ResultPanelProps {
  result: string;
  isLoading: boolean;
  error: string | null;
  language: ProgrammingLanguage;
}

export function ResultPanel({
  result,
  isLoading,
  error,
  language,
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Code aus Markdown extrahieren
  const extractCode = (text: string): string | null => {
    const match = text.match(/```[\w]*\n?([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  };

  const codeOnly = extractCode(result);

  return (
    <div className="bg-gray-800 rounded-lg p-4 min-h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Ergebnis</h2>
        {result && (
          <div className="flex gap-2">
            {codeOnly && (
              <button
                onClick={() => navigator.clipboard.writeText(codeOnly)}
                className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600"
              >
                Nur Code
              </button>
            )}
            <button
              onClick={handleCopy}
              className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600"
            >
              {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 mb-4">
          {error}
        </div>
      )}

      {isLoading && !result && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="flex flex-col items-center gap-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" />
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
            <span>Verarbeite...</span>
          </div>
        </div>
      )}

      {result && (
        <div className="flex-1 overflow-auto">
          <ResultRenderer content={result} language={language} />
        </div>
      )}

      {!result && !isLoading && !error && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Ergebnis wird hier angezeigt
        </div>
      )}
    </div>
  );
}

function ResultRenderer({
  content,
  language,
}: {
  content: string;
  language: ProgrammingLanguage;
}) {
  // Code-Blöcke parsen und rendern
  const parts = content.split(/(```[\w]*\n?[\s\S]*?```)/g);

  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
          if (match) {
            const lang = match[1] || language;
            const code = match[2].trim();
            return (
              <div key={index} className="relative group">
                <div className="absolute top-2 right-2 text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded">
                  {lang}
                </div>
                <pre className="bg-gray-900 rounded-lg p-4 pt-8 overflow-x-auto">
                  <code className="text-sm font-mono text-gray-100">
                    {code}
                  </code>
                </pre>
              </div>
            );
          }
        }

        // Normaler Text
        if (part.trim()) {
          return (
            <div key={index} className="text-gray-300 whitespace-pre-wrap">
              {formatText(part)}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

function formatText(text: string): React.ReactNode {
  // Einfache Markdown-Formatierung
  const lines = text.split('\n');

  return lines.map((line, i) => {
    // Headers
    if (line.startsWith('### ')) {
      return (
        <h3 key={i} className="text-lg font-semibold mt-4 mb-2">
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2 key={i} className="text-xl font-semibold mt-4 mb-2">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith('# ')) {
      return (
        <h1 key={i} className="text-2xl font-bold mt-4 mb-2">
          {line.slice(2)}
        </h1>
      );
    }

    // Lists
    if (line.match(/^[0-9]+\. /)) {
      return (
        <li key={i} className="ml-4 list-decimal">
          {line.replace(/^[0-9]+\. /, '')}
        </li>
      );
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li key={i} className="ml-4 list-disc">
          {line.slice(2)}
        </li>
      );
    }

    // Bold and inline code
    const formatted = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 rounded">$1</code>');

    return (
      <p
        key={i}
        dangerouslySetInnerHTML={{ __html: formatted }}
        className="leading-relaxed"
      />
    );
  });
}
