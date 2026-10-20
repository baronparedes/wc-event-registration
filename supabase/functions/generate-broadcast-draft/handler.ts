import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

import { getGoogleAiApiKey, getGoogleAiModel } from '@/shared/ai.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';

import { getSystemPrompt, getUserPrompt, parseDraftResponse } from './prompt.ts';
import { generateBroadcastDraftPayloadSchema } from './types.ts';

export async function handleGenerateBroadcastDraft(req: Request): Promise<Response> {
  const startTime = performance.now();

  const hook = await useEdgeHook({
    req,
    functionName: 'generate-broadcast-draft',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin'],
    rateLimit: {
      scope: 'generate-broadcast-draft',
      windowMs: 60 * 1000,
      maxHits: 20,
    },
    schema: generateBroadcastDraftPayloadSchema,
  });

  if (!hook.valid) {
    if (hook.response.status === 429) {
      return errorResponse(
        hook.corsHeaders,
        429,
        'Too many draft requests. Please wait a moment before trying again.',
        undefined,
        { error_code: 'RATE_LIMITED' },
      );
    }
    return hook.response;
  }

  const { data: payload, corsHeaders, requestId } = hook;

  const apiKey = getGoogleAiApiKey();
  const model = getGoogleAiModel();

  if (!apiKey) {
    console.error('[generate-broadcast-draft] GOOGLE_API_KEY is not configured', { requestId });
    return errorResponse(corsHeaders, 500, 'AI drafting service is not configured');
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const systemPrompt = getSystemPrompt();
    const userPrompt = getUserPrompt(payload);

    console.log('[generate-broadcast-draft] Requesting Gemini draft', {
      requestId,
      model,
      mode: payload.mode,
      tone: payload.tone,
      inputLength: payload.notes.length,
    });

    const result = await generateText({
      model: google(model),
      system: systemPrompt,
      prompt: userPrompt,
    });

    const durationMs = Math.round(performance.now() - startTime);
    console.log('[generate-broadcast-draft] Draft generated successfully', {
      requestId,
      durationMs,
      finishReason: result.finishReason,
      usage: result.usage,
    });

    const parsed = parseDraftResponse(result.text);

    return jsonResponse(corsHeaders, {
      success: true,
      draft: parsed,
    });
  } catch (error) {
    console.error('[generate-broadcast-draft] Failed to generate broadcast draft', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(
      corsHeaders,
      500,
      'Failed to generate draft. Please try again or refine your input.',
    );
  }
}
