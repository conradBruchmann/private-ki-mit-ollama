"use client";

import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Sidebar } from "./Sidebar";
import { useChat } from "@/hooks/useChat";
import { useChatStore } from "@/store/chatStore";

/**
 * Haupt-Chat-Komponente
 *
 * Kombiniert Sidebar, Nachrichtenliste und Eingabefeld.
 */
export function Chat() {
  const {
    conversation,
    isLoading,
    error,
    streamingContent,
    sendMessage,
    stopGeneration,
  } = useChat();

  const { model, setModel } = useChatStore();

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h1 className="text-xl font-semibold text-white">
            {conversation?.title ?? "Ollama Chat"}
          </h1>

          {/* Model Selector */}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="llama3.2">Llama 3.2</option>
            <option value="llama3.1:8b">Llama 3.1 8B</option>
            <option value="llama3.1:70b">Llama 3.1 70B</option>
            <option value="qwen2.5:7b">Qwen 2.5 7B</option>
            <option value="qwen2.5:14b">Qwen 2.5 14B</option>
            <option value="qwen2.5-coder:7b">Qwen Coder 7B</option>
            <option value="mistral">Mistral 7B</option>
            <option value="deepseek-coder:6.7b">DeepSeek Coder</option>
          </select>
        </header>

        {/* Messages */}
        <MessageList
          messages={conversation?.messages ?? []}
          streamingContent={streamingContent}
          isLoading={isLoading}
        />

        {/* Error Display */}
        {error && (
          <div className="mx-6 mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Input */}
        <MessageInput
          onSend={sendMessage}
          onStop={stopGeneration}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
