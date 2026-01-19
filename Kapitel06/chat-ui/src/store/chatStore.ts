import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Eine einzelne Chat-Nachricht
 */
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

/**
 * Eine Conversation mit mehreren Nachrichten
 */
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Chat Store State und Actions
 */
interface ChatState {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;

  // UI State
  isLoading: boolean;
  error: string | null;
  streamingContent: string;

  // Settings
  model: string;
  systemPrompt: string;

  // Actions
  createConversation: () => string;
  setActiveConversation: (id: string) => void;
  deleteConversation: (id: string) => void;

  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  updateStreamingContent: (content: string) => void;
  finalizeAssistantMessage: () => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setModel: (model: string) => void;
  setSystemPrompt: (prompt: string) => void;

  // Computed
  activeConversation: () => Conversation | null;
}

/**
 * Zustand Store mit Persistierung
 */
export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial State
      conversations: [],
      activeConversationId: null,
      isLoading: false,
      error: null,
      streamingContent: "",
      model: "llama3.2",
      systemPrompt: "Du bist ein hilfreicher Assistent. Antworte auf Deutsch.",

      /**
       * Neue Conversation erstellen
       */
      createConversation: () => {
        const id = crypto.randomUUID();
        const conversation: Conversation = {
          id,
          title: "Neue Unterhaltung",
          messages: [],
          model: get().model,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
          error: null,
        }));

        return id;
      },

      /**
       * Aktive Conversation setzen
       */
      setActiveConversation: (id) => {
        set({ activeConversationId: id, error: null, streamingContent: "" });
      },

      /**
       * Conversation löschen
       */
      deleteConversation: (id) => {
        set((state) => {
          const remaining = state.conversations.filter((c) => c.id !== id);
          return {
            conversations: remaining,
            activeConversationId:
              state.activeConversationId === id
                ? remaining[0]?.id ?? null
                : state.activeConversationId,
          };
        });
      },

      /**
       * Nachricht zur aktiven Conversation hinzufügen
       */
      addMessage: (message) => {
        const conversationId = get().activeConversationId;
        if (!conversationId) return;

        const newMessage: Message = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        };

        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, newMessage],
                  updatedAt: new Date(),
                  // Auto-Title nach erster User-Message
                  title:
                    conv.messages.length === 0 && message.role === "user"
                      ? message.content.length > 30
                        ? message.content.slice(0, 30) + "..."
                        : message.content
                      : conv.title,
                }
              : conv
          ),
        }));
      },

      /**
       * Streaming-Content aktualisieren
       */
      updateStreamingContent: (content) => {
        set((state) => ({
          streamingContent: state.streamingContent + content,
        }));
      },

      /**
       * Streaming abschließen und als Message speichern
       */
      finalizeAssistantMessage: () => {
        const content = get().streamingContent;
        if (content) {
          get().addMessage({ role: "assistant", content });
        }
        set({ streamingContent: "", isLoading: false });
      },

      /**
       * Loading-State setzen
       */
      setLoading: (loading) => set({ isLoading: loading }),

      /**
       * Error-State setzen
       */
      setError: (error) => set({ error, isLoading: false }),

      /**
       * Modell wechseln
       */
      setModel: (model) => set({ model }),

      /**
       * System-Prompt ändern
       */
      setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),

      /**
       * Aktive Conversation abrufen
       */
      activeConversation: () => {
        const state = get();
        return (
          state.conversations.find(
            (c) => c.id === state.activeConversationId
          ) ?? null
        );
      },
    }),
    {
      name: "ollama-chat-storage",
      // Nur bestimmte Felder persistieren
      partialize: (state) => ({
        conversations: state.conversations,
        model: state.model,
        systemPrompt: state.systemPrompt,
      }),
    }
  )
);
