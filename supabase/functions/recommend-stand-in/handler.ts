import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

import { getGoogleAiApiKey, getGoogleAiModel } from '@/shared/ai.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';

import { getSystemPrompt, getUserPrompt, parseStandInResponse } from './prompt.ts';
import { recommendStandInPayloadSchema } from './types.ts';

export async function handleRecommendStandIn(req: Request): Promise<Response> {
  const startTime = performance.now();

  const hook = await useEdgeHook({
    req,
    functionName: 'recommend-stand-in',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin', 'slod'],
    rateLimit: {
      scope: 'recommend-stand-in',
      windowMs: 60 * 1000,
      maxHits: 30,
    },
    schema: recommendStandInPayloadSchema,
  });

  if (!hook.valid) {
    if (hook.response.status === 429) {
      return errorResponse(
        hook.corsHeaders,
        429,
        'Too many recommendation requests. Please wait a moment before trying again.',
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
    console.error('[recommend-stand-in] GOOGLE_API_KEY is not configured', { requestId });
    return errorResponse(corsHeaders, 500, 'AI recommendation service is not configured');
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const systemPrompt = getSystemPrompt(payload.neededCount);
    const userPrompt = getUserPrompt(payload);

    console.log('[recommend-stand-in] Requesting Gemini stand-in recommendation', {
      requestId,
      model,
      role: payload.role,
      targetDate: payload.targetDate,
      timeSlot: payload.timeSlot,
      candidateCount: payload.candidates.length,
      neededCount: payload.neededCount,
    });

    const result = await generateText({
      model: google(model),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
    });

    const draft = parseStandInResponse(result.text, payload);
    const durationMs = Math.round(performance.now() - startTime);

    console.log('[recommend-stand-in] Successfully evaluated stand-ins', {
      requestId,
      durationMs,
      recommendationCount: draft.recommendations.length,
    });

    return jsonResponse(corsHeaders, {
      success: true,
      data: draft,
    });
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - startTime);
    const message = err instanceof Error ? err.message : String(err);
    console.error('[recommend-stand-in] Error generating recommendation', {
      requestId,
      durationMs,
      error: message,
    });

    return errorResponse(
      corsHeaders,
      500,
      'Failed to generate stand-in recommendation. Please try again.',
      undefined,
      { error_code: 'AI_RECOMMENDATION_FAILED' },
    );
  }
}
