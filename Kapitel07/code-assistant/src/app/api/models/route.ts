/**
 * Models API Route
 * Kapitel 7: Code-Assistent mit Ollama
 *
 * GET /api/models - Verfügbare Code-Modelle auflisten
 */

import { NextRequest } from 'next/server';
import { CodeAssistantService } from '@/lib/code-assistant/service';
import { CODE_MODELS } from '@/lib/code-assistant/types';

export async function GET(request: NextRequest) {
  try {
    const service = new CodeAssistantService();
    const availableModels = await service.listAvailableModels();

    // Empfohlene Modelle mit Verfügbarkeits-Status
    const models = CODE_MODELS.map((model) => ({
      ...model,
      available: availableModels.some(
        (m) =>
          m === model.name || m.startsWith(model.name.split(':')[0])
      ),
    }));

    return Response.json({
      models,
      installed: availableModels,
      current: service.getModel(),
    });
  } catch (error) {
    console.error('Models API error:', error);
    return Response.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
