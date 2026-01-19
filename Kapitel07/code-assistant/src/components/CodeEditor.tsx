/**
 * Code-Editor Komponente
 * Kapitel 7: Code-Assistent mit Ollama
 */

'use client';

import { ProgrammingLanguage } from '@/lib/code-assistant/types';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: ProgrammingLanguage;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
}

export function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
  readOnly = false,
  minHeight = '300px',
}: CodeEditorProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab-Unterstützung
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newValue =
        value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      // Cursor-Position setzen
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
        {language}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        style={{ minHeight }}
        className={`w-full px-4 py-3 pt-8 bg-gray-800 rounded-lg border border-gray-700 font-mono text-sm resize-y focus:outline-none focus:border-blue-500 ${
          readOnly ? 'cursor-default' : ''
        }`}
      />
      <div className="absolute bottom-2 right-2 text-xs text-gray-500">
        {value.split('\n').length} Zeilen
      </div>
    </div>
  );
}
