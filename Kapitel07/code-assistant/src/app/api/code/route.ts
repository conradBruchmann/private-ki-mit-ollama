/**
 * Code-Assistent API Route
 * Kapitel 7: Code-Assistent mit Ollama
 *
 * POST /api/code - Code-Operation ausführen (Streaming)
 */

import { NextRequest } from 'next/server';
import { CodeAssistantService } from '@/lib/code-assistant/service';
import { CodeRequest, CodeOperation } from '@/lib/code-assistant/types';

const CODE_OPERATIONS_REQUIRING_CODE: CodeOperation[] = [
  'explain',
  'test',
  'refactor',
  'document',
  'fix',
  'complete',
];

export async function POST(request: NextRequest) {
  try {
    const body: CodeRequest = await request.json();

    // Validierung
    if (!body.operation) {
      return Response.json({ error: 'Operation required' }, { status: 400 });
    }

    if (!body.language) {
      return Response.json({ error: 'Language required' }, { status: 400 });
    }

    if (
      CODE_OPERATIONS_REQUIRING_CODE.includes(body.operation) &&
      !body.code
    ) {
      return Response.json(
        { error: 'Code required for this operation' },
        { status: 400 }
      );
    }

    if (body.operation === 'generate' && !body.prompt) {
      return Response.json(
        { error: 'Prompt required for generate operation' },
        { status: 400 }
      );
    }

    // Model aus Query oder Default
    const model = request.nextUrl.searchParams.get('model') || undefined;
    const service = new CodeAssistantService({ model });

    // Streaming Response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const chunk of service.stream(body)) {
            const data = JSON.stringify({ content: chunk });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          console.error('Code assistant error:', error);
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Non-streaming endpoint für einfache Requests
export async function PUT(request: NextRequest) {
  try {
    const body: CodeRequest = await request.json();

    if (!body.operation || !body.language) {
      return Response.json(
        { error: 'Operation and language required' },
        { status: 400 }
      );
    }

    const model = request.nextUrl.searchParams.get('model') || undefined;
    const service = new CodeAssistantService({ model });

    const response = await service.execute(body);

    return Response.json(response);
  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
