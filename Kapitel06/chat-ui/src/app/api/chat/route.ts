import { NextRequest } from "next/server";
import { Ollama } from "ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ollama-Client mit konfigurierbarer URL (für Vercel-Deployment)
const ollamaClient = new Ollama({
  host: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
});

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  model?: string;
}

/**
 * POST /api/chat
 *
 * Leitet Chat-Anfragen an Ollama weiter und streamt die Antwort als SSE.
 */
export async function POST(request: NextRequest) {
  try {
    const { messages, model = "llama3.2" }: ChatRequestBody =
      await request.json();

    // Validierung
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ollama-Stream starten
    const response = await ollamaClient.chat({
      model,
      messages,
      stream: true,
    });

    // ReadableStream für SSE erstellen
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const chunk of response) {
            const data = JSON.stringify({
              content: chunk.message.content,
              done: chunk.done,
            });

            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

            if (chunk.done) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : "Stream failed",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    // Spezifische Fehlermeldungen
    if (errorMessage.includes("ECONNREFUSED")) {
      return new Response(
        JSON.stringify({
          error: "Ollama nicht erreichbar. Starten Sie Ollama mit: ollama serve",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    if (errorMessage.includes("not found")) {
      return new Response(
        JSON.stringify({
          error: `Modell nicht gefunden. Installieren Sie es mit: ollama pull <modell>`,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * GET /api/chat
 *
 * Gibt die Liste der verfügbaren Modelle zurück.
 */
export async function GET() {
  try {
    const response = await ollamaClient.list();

    const models = response.models.map((m) => ({
      name: m.name,
      size: m.size,
      modifiedAt: m.modified_at,
    }));

    return new Response(JSON.stringify({ models }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List models error:", error);

    return new Response(
      JSON.stringify({
        error: "Modelle konnten nicht geladen werden",
        models: [],
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
