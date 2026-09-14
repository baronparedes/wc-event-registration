import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@^1.1.0';
import { streamText } from 'npm:ai@^4.1.0';

import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

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
    schema: chatRequestSchema,
  });

  if (!guard.valid) {
    console.warn('[chat] Request rejected by edge guard', {
      requestId: guard.requestId,
      status: guard.response.status,
    });
    return guard.response;
  }

  const { messages } = guard.data;
  const { corsHeaders, requestId, userId } = guard;

  console.log('[chat] Request authenticated and validated', {
    requestId,
    userId,
    messageCount: messages.length,
    lastMessageRole: messages[messages.length - 1]?.role,
  });

  const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY');

  if (!apiKey) {
    console.error('[chat] GOOGLE_API_KEY environment variable is not configured', {
      requestId,
    });
    return errorResponse(corsHeaders, 500, 'GOOGLE_API_KEY not configured');
  }

  try {
    console.log('[chat] Starting Gemini stream generation', {
      requestId,
      model: 'gemini-3.6-flash',
    });

    const google = createGoogleGenerativeAI({ apiKey });

    const result = streamText({
      model: google('gemini-3.6-flash'),
      messages,
      tools: {},
      onFinish: ({ text, finishReason, usage }) => {
        const durationMs = Math.round(performance.now() - startTime);
        console.log('[chat] Generation stream finished', {
          requestId,
          durationMs,
          finishReason,
          responseLength: text.length,
          promptTokens: usage?.promptTokens,
          completionTokens: usage?.completionTokens,
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

    let response: Response;
    if (
      typeof (streamResult as { toDataStreamResponse?: unknown }).toDataStreamResponse ===
      'function'
    ) {
      response = (
        streamResult as {
          toDataStreamResponse: (opts?: { headers?: Record<string, string> }) => Response;
        }
      ).toDataStreamResponse({
        headers: corsHeaders,
      });
    } else if (
      typeof (streamResult as { toTextStreamResponse?: unknown }).toTextStreamResponse ===
      'function'
    ) {
      response = (
        streamResult as {
          toTextStreamResponse: (opts?: { headers?: Record<string, string> }) => Response;
        }
      ).toTextStreamResponse({
        headers: corsHeaders,
      });
    } else {
      response = new Response(
        (streamResult as { textStream: ReadableStream<Uint8Array | string> })
          .textStream as BodyInit,
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            ...corsHeaders,
          },
        },
      );
    }

    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    console.error('[chat] Unexpected error processing chat request', {
      requestId,
      durationMs,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return errorResponse(corsHeaders, 500, 'Failed to process request');
  }
});
