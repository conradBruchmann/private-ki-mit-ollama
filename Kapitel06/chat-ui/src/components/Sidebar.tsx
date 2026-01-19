"use client";

import { useChatStore } from "@/store/chatStore";
import { useState } from "react";

/**
 * Sidebar mit Conversation-Liste und Einstellungen
 */
export function Sidebar() {
  const {
    conversations,
    activeConversationId,
    createConversation,
    setActiveConversation,
    deleteConversation,
    systemPrompt,
    setSystemPrompt,
  } = useChatStore();

  const [showSettings, setShowSettings] = useState(false);

  return (
    <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={() => createConversation()}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Neuer Chat</span>
        </button>
      </div>

      {/* Conversation List */}
      <nav className="flex-1 overflow-y-auto px-2">
        <div className="text-xs text-gray-500 px-3 py-2 uppercase tracking-wider">
          Unterhaltungen
        </div>

        {conversations.length === 0 && (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            Noch keine Unterhaltungen
          </div>
        )}

        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center px-3 py-2 mb-1 rounded-lg cursor-pointer transition-colors ${
              conv.id === activeConversationId
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
            }`}
            onClick={() => setActiveConversation(conv.id)}
          >
            {/* Chat Icon */}
            <svg
              className="w-4 h-4 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>

            {/* Title */}
            <span className="flex-1 truncate text-sm">{conv.title}</span>

            {/* Message Count */}
            <span className="text-xs text-gray-500 mr-2">
              {conv.messages.length}
            </span>

            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(conv.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
              title="Löschen"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        ))}
      </nav>

      {/* Settings Section */}
      <div className="border-t border-gray-800">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full px-4 py-3 text-left text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm">Einstellungen</span>
          </div>
          <svg
            className={`w-4 h-4 transition-transform ${showSettings ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                System-Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Definiere die Persönlichkeit des Assistenten..."
              />
            </div>

            {/* Preset Prompts */}
            <div className="flex flex-wrap gap-1">
              {[
                { label: "Standard", prompt: "Du bist ein hilfreicher Assistent. Antworte auf Deutsch." },
                { label: "Coder", prompt: "Du bist ein erfahrener Programmierer. Erkläre Code klar und gib Beispiele." },
                { label: "Lehrer", prompt: "Du bist ein geduldiger Lehrer. Erkläre Konzepte einfach und nutze Analogien." },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setSystemPrompt(preset.prompt)}
                  className="px-2 py-1 text-xs bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 text-xs text-gray-500 text-center">
        <div className="flex items-center justify-center space-x-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Ollama verbunden</span>
        </div>
      </div>
    </aside>
  );
}
