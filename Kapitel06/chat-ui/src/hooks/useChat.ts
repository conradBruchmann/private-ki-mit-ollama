import { useCallback, useRef } from "react";
import { useChatStore } from "@/store/chatStore";

/**
 * Custom Hook für Chat-Funktionalität
 *
 * Verwaltet das Senden von Nachrichten, Streaming und Abbruch.
 */
export function useChat() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    activeConversation,
    isLoading,
    error,
    streamingContent,
    model,
    systemPrompt,
    addMessage,
    updateStreamingContent,
    finalizeAssistantMessage,
    setLoading,
    setError,
    createConversation,
  } = useChatStore();

  /**
   * Nachricht senden und Antwort streamen
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Conversation erstellen falls keine aktiv
      let conversationId = useChatStore.getState().activeConversationId;
      if (!conversationId) {
        conversationId = createConversation();
      }

      // User-Message hinzufügen
      addMessage({ role: "user", content });
      setLoading(true);
      setError(null);

      // AbortController für Abbruch
      abortControllerRef.current = new AbortController();

      // Messages für API vorbereiten
      const conversation = useChatStore.getState().activeConversation();
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(conversation?.messages ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user" as const, content },
      ];

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, model }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        // Stream lesen
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);

              if (data === "[DONE]") {
                finalizeAssistantMessage();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  updateStreamingContent(parsed.content);
                }
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch {
                // Ignoriere Parse-Fehler bei unvollständigen Chunks
              }
            }
          }
        }

        finalizeAssistantMessage();
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // Abbruch durch Benutzer
          finalizeAssistantMessage();
          return;
        }

        console.error("Chat error:", error);
        setError(
          error instanceof Error ? error.message : "Ein Fehler ist aufgetreten"
        );
        finalizeAssistantMessage();
      } finally {
        abortControllerRef.current = null;
      }
    },
    [
      isLoading,
      model,
      systemPrompt,
      addMessage,
      updateStreamingContent,
      finalizeAssistantMessage,
      setLoading,
      setError,
      createConversation,
    ]
  );

  /**
   * Generierung abbrechen
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    finalizeAssistantMessage();
  }, [finalizeAssistantMessage]);

  return {
    conversation: activeConversation(),
    isLoading,
    error,
    streamingContent,
    sendMessage,
    stopGeneration,
  };
}
