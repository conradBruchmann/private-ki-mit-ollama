"use client";

import { useEffect, useRef } from "react";
import { Message as MessageType } from "@/store/chatStore";
import { Message } from "./Message";

interface MessageListProps {
  messages: MessageType[];
  streamingContent: string;
  isLoading: boolean;
}

/**
 * Liste aller Nachrichten mit Auto-Scroll
 */
export function MessageList({
  messages,
  streamingContent,
  isLoading,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll bei neuen Nachrichten
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
      {/* Empty State */}
      {messages.length === 0 && !streamingContent && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <svg
            className="w-16 h-16 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-lg font-medium">Starten Sie eine Unterhaltung</p>
          <p className="text-sm mt-2 text-center max-w-md">
            Ihr lokaler KI-Assistent ist bereit. Stellen Sie eine Frage oder
            beschreiben Sie, wobei Sie Hilfe benötigen.
          </p>

          {/* Quick Suggestions */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg">
            {[
              "Erkläre mir Docker in einfachen Worten",
              "Schreibe eine Python-Funktion für Fibonacci",
              "Was sind die SOLID-Prinzipien?",
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="px-3 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                onClick={() => {
                  // Trigger via custom event
                  window.dispatchEvent(
                    new CustomEvent("suggestion-click", {
                      detail: suggestion,
                    })
                  );
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message List */}
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}

      {/* Streaming Message */}
      {streamingContent && (
        <Message
          message={{
            id: "streaming",
            role: "assistant",
            content: streamingContent,
            timestamp: new Date(),
          }}
          isStreaming
        />
      )}

      {/* Loading Indicator (before streaming starts) */}
      {isLoading && !streamingContent && (
        <div className="flex items-center space-x-3 text-gray-400">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs">
            AI
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-sm">Denkt nach...</span>
          </div>
        </div>
      )}

      {/* Scroll Anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
