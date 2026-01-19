"use client";

import { Message as MessageType } from "@/store/chatStore";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";

interface MessageProps {
  message: MessageType;
  isStreaming?: boolean;
}

/**
 * Einzelne Chat-Nachricht mit Markdown-Rendering
 */
export function Message({ message, isStreaming }: MessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
        }`}
      >
        {/* Avatar und Header für Assistant */}
        {!isUser && (
          <div className="flex items-center space-x-2 mb-2 text-sm text-gray-400">
            <span className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
              AI
            </span>
            <span>Assistent</span>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse rounded-sm" />
            )}
          </div>
        )}

        {/* Content mit Markdown */}
        <div className="prose prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent">
          <ReactMarkdown
            components={{
              // Code-Blöcke mit Syntax Highlighting
              code({ inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const codeString = String(children).replace(/\n$/, "");

                if (!inline && match) {
                  return (
                    <div className="relative group">
                      {/* Copy Button */}
                      <button
                        onClick={() => copyToClipboard(codeString)}
                        className="absolute right-2 top-2 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-600"
                      >
                        {copied ? "Kopiert!" : "Kopieren"}
                      </button>

                      {/* Language Badge */}
                      <span className="absolute left-2 top-2 px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
                        {match[1]}
                      </span>

                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: "0.5rem",
                          paddingTop: "2.5rem",
                        }}
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                }

                // Inline Code
                return (
                  <code
                    className="bg-gray-700/50 px-1.5 py-0.5 rounded text-sm"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },

              // Links
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {children}
                  </a>
                );
              },

              // Paragraphs
              p({ children }) {
                return <p className="mb-2 last:mb-0">{children}</p>;
              },

              // Lists
              ul({ children }) {
                return <ul className="list-disc pl-4 mb-2">{children}</ul>;
              },

              ol({ children }) {
                return <ol className="list-decimal pl-4 mb-2">{children}</ol>;
              },

              // Blockquote
              blockquote({ children }) {
                return (
                  <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-400">
                    {children}
                  </blockquote>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Timestamp */}
        <div
          className={`mt-2 text-xs ${isUser ? "text-blue-200" : "text-gray-500"}`}
        >
          {new Date(message.timestamp).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
