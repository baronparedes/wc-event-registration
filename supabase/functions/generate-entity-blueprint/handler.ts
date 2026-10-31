import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

import { getGoogleAiApiKey, getGoogleAiModel } from '@/shared/ai.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';

import { getSystemPrompt, getUserPrompt, parseBlueprintResponse } from './prompt.ts';
import { generateEntityBlueprintPayloadSchema } from './types.ts';

export async function handleGenerateEntityBlueprint(req: Request): Promise<Response> {
  const startTime = performance.now();

  const hook = await useEdgeHook({
    req,
    functionName: 'generate-entity-blueprint',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin'],
    rateLimit: {
      scope: 'generate-entity-blueprint',
      windowMs: 60 * 1000,
      maxHits: 20,
    },
    schema: generateEntityBlueprintPayloadSchema,
  });

  if (!hook.valid) {
    if (hook.response.status === 429) {
      return errorResponse(
        hook.corsHeaders,
        429,
        'Too many blueprint generation requests. Please wait a moment before trying again.',
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
    console.error('[generate-entity-blueprint] GOOGLE_API_KEY is not configured', { requestId });
    return errorResponse(corsHeaders, 500, 'AI generation service is not configured');
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const systemPrompt = getSystemPrompt(payload.domain);
    const userPrompt = getUserPrompt(payload);

    console.log('[generate-entity-blueprint] Requesting Gemini blueprint', {
      requestId,
      model,
      domain: payload.domain,
      promptLength: payload.prompt.length,
    });

    const result = await generateText({
      model: google(model),
      system: systemPrompt,
      prompt: userPrompt,
    });

    const durationMs = Math.round(performance.now() - startTime);
    console.log('[generate-entity-blueprint] Blueprint generated successfully', {
      requestId,
      durationMs,
      finishReason: result.finishReason,
      usage: result.usage,
    });

    const parsed = parseBlueprintResponse(result.text, payload.domain, payload.audiencePreference);

    return jsonResponse(corsHeaders, parsed);
  } catch (err) {
    console.error('[generate-entity-blueprint] Error generating blueprint', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });

    return errorResponse(
      corsHeaders,
      500,
      'Failed to generate blueprint. Please try again with more specific details.',
      undefined,
      { error_code: 'AI_GENERATION_FAILED' },
    );
  }
}
