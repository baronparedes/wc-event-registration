import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { stepCountIs, streamText } from 'ai';

import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

import { getSystemPrompt } from './prompt.ts';
import { createChatTools } from './tools/index.ts';

const chatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema),
});

Deno.serve(async (req) => {
  const startTime = performance.now();
  console.log('[chat] Incoming request received', {
    method: req.method,
    url: req.url,
  });

  const guard = await useEdgeHook({
    req,
    functionName: 'chat',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['slod', 'admin', 'super_admin'],
    rateLimit: {
      scope: 'chat',
      windowMs: 60 * 1000,
      maxHits: 15,
    },
    schema: chatRequestSchema,
  });

  if (!guard.valid) {
    console.warn('[chat] Request rejected by edge guard', {
      requestId: guard.requestId,
      status: guard.response.status,
    });
    if (guard.response.status === 429) {
      return errorResponse(
        guard.corsHeaders,
        429,
        "I'm on a coffee break, you can come back later.",
        undefined,
        { error_code: 'RATE_LIMITED' },
      );
    }
    return guard.response;
  }

  const { messages } = guard.data;
  const { corsHeaders, requestId, userId, client } = guard;

  console.log('[chat] Request authenticated and validated', {
    requestId,
    userId,
    messageCount: messages.length,
    lastMessageRole: messages[messages.length - 1]?.role,
  });

  const apiKey =
    Deno.env.get('GOOGLE_API_KEY') ?? Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY') ?? undefined;
  const model = Deno.env.get('GOOGLE_AI_MODEL') ?? 'gemini-3.5-flash-lite';

  if (!apiKey) {
    console.error('[chat] GOOGLE_API_KEY environment variable is not configured', {
      requestId,
    });
    return errorResponse(corsHeaders, 500, 'GOOGLE_API_KEY not configured');
  }

  try {
    console.log('[chat] Starting Gemini stream generation', {
      requestId,
      model,
    });

    const google = createGoogleGenerativeAI({ apiKey });

    const tools = createChatTools({ client, requestId, userId });

    const result = streamText({
      model: google(model),
      system: getSystemPrompt(),
      messages,
      tools,
      stopWhen: stepCountIs(5),
      onStepFinish: (step) => {
        console.log('[chat] Step finished', {
          requestId,
          finishReason: step.finishReason,
          toolCalls: step.toolCalls?.map((toolCall) => toolCall.toolName),
          textLength: step.text?.length ?? 0,
        });
      },
      onFinish: ({ text, finishReason, usage, steps }) => {
        const durationMs = Math.round(performance.now() - startTime);
        const toolsExecuted = steps.flatMap((s) => (s.toolCalls ?? []).map((tc) => tc.toolName));
        console.log('[chat] Generation stream finished', {
          requestId,
          durationMs,
          finishReason,
          responseLength: text.length,
          toolsExecuted,
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
          totalTokens: usage?.totalTokens,
        });
      },
      onError: ({ error }) => {
        console.error('[chat] Stream error occurred during generation', {
          requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      },
    });

    const streamResult = await Promise.resolve(result);

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = (streamResult.textStream as ReadableStream<string>).getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              controller.enqueue(encoder.encode(value));
            }
          }
          controller.close();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error('[chat] Stream error caught in reader:', { requestId, error: errMsg });
          const isQuota = /429|quota|resource_exhausted|rate\s*limit/i.test(errMsg);
          const fallback = isQuota
            ? "I'm on a coffee break, you can come back later."
            : 'Sorry, I encountered an error.';
          controller.enqueue(encoder.encode(fallback));
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...corsHeaders,
      },
    });
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[chat] Unexpected error processing chat request', {
      requestId,
      durationMs,
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
    });

    const isRateLimitOrQuota =
      (err as { status?: number })?.status === 429 ||
      /429|quota|resource_exhausted|rate\s*limit/i.test(errorMessage);

    if (isRateLimitOrQuota) {
      return errorResponse(
        corsHeaders,
        429,
        "I'm on a coffee break, you can come back later.",
        undefined,
        { error_code: 'RATE_LIMITED' },
      );
    }

    return errorResponse(corsHeaders, 500, 'Failed to process request');
  }
});
