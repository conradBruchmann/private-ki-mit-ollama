"use client";

import { useState, useRef, useEffect } from "react";

interface MessageInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isLoading: boolean;
}

/**
 * Eingabefeld für neue Nachrichten
 */
export function MessageInput({ onSend, onStop, isLoading }: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize Textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [input]);

  // Listen for suggestion clicks
  useEffect(() => {
    const handleSuggestion = (e: CustomEvent<string>) => {
      setInput(e.detail);
      textareaRef.current?.focus();
    };

    window.addEventListener(
      "suggestion-click",
      handleSuggestion as EventListener
    );
    return () => {
      window.removeEventListener(
        "suggestion-click",
        handleSuggestion as EventListener
      );
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-6 py-4 border-t border-gray-700 bg-gray-900"
    >
      <div className="flex items-end space-x-4">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nachricht eingeben... (Shift+Enter für neue Zeile)"
            rows={1}
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-600 focus:outline-none focus:border-blue-500 resize-none placeholder-gray-500"
            disabled={isLoading}
          />

          {/* Character count */}
          {input.length > 500 && (
            <span className="absolute right-3 bottom-3 text-xs text-gray-500">
              {input.length}
            </span>
          )}
        </div>

        {/* Send / Stop Button */}
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            <span className="hidden sm:inline">Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        )}
      </div>

      {/* Hints */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Enter zum Senden, Shift+Enter für neue Zeile</span>
        <span>Powered by Ollama</span>
      </div>
    </form>
  );
}
