/**
 * React Hook für Code-Assistent
 * Kapitel 7: Code-Assistent mit Ollama
 */

'use client';

import { useState, useCallback } from 'react';
import {
  CodeOperation,
  ProgrammingLanguage,
  CodeRequest,
  FileContext,
} from '@/lib/code-assistant/types';

interface UseCodeAssistantState {
  result: string;
  isLoading: boolean;
  error: string | null;
}

export function useCodeAssistant() {
  const [state, setState] = useState<UseCodeAssistantState>({
    result: '',
    isLoading: false,
    error: null,
  });

  const execute = useCallback(
    async (
      operation: CodeOperation,
      options: {
        code?: string;
        prompt?: string;
        language: ProgrammingLanguage;
        context?: string;
        files?: FileContext[];
      }
    ) => {
      setState({ result: '', isLoading: true, error: null });

      const request: CodeRequest = {
        operation,
        ...options,
      };

      try {
        const response = await fetch('/api/code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Request failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let fullResult = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResult += parsed.content;
                  setState((prev) => ({
                    ...prev,
                    result: fullResult,
                  }));
                }
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        }

        setState((prev) => ({ ...prev, isLoading: false }));
        return fullResult;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        setState({ result: '', isLoading: false, error: message });
        throw error;
      }
    },
    []
  );

  const explain = useCallback(
    (
      code: string,
      language: ProgrammingLanguage,
      context?: string,
      files?: FileContext[]
    ) => execute('explain', { code, language, context, files }),
    [execute]
  );

  const generate = useCallback(
    (
      prompt: string,
      language: ProgrammingLanguage,
      context?: string,
      files?: FileContext[]
    ) => execute('generate', { prompt, language, context, files }),
    [execute]
  );

  const test = useCallback(
    (
      code: string,
      language: ProgrammingLanguage,
      context?: string,
      files?: FileContext[]
    ) => execute('test', { code, language, context, files }),
    [execute]
  );

  const refactor = useCallback(
    (
      code: string,
      language: ProgrammingLanguage,
      context?: string,
      files?: FileContext[]
    ) => execute('refactor', { code, language, context, files }),
    [execute]
  );

  const document = useCallback(
    (
      code: string,
      language: ProgrammingLanguage,
      context?: string,
      files?: FileContext[]
    ) => execute('document', { code, language, context, files }),
    [execute]
  );

  const fix = useCallback(
    (
      code: string,
      language: ProgrammingLanguage,
      context?: string,
      files?: FileContext[]
    ) => execute('fix', { code, language, context, files }),
    [execute]
  );

  const complete = useCallback(
    (
      code: string,
      language: ProgrammingLanguage,
      context?: string,
      files?: FileContext[]
    ) => execute('complete', { code, language, context, files }),
    [execute]
  );

  const reset = useCallback(() => {
    setState({ result: '', isLoading: false, error: null });
  }, []);

  return {
    ...state,
    explain,
    generate,
    test,
    refactor,
    document,
    fix,
    complete,
    reset,
  };
}
