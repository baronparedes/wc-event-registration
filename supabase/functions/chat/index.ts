import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@^4.0.67';
import { stepCountIs, streamText } from 'npm:ai@latest';

import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

import { createChatTools } from './tools/index.ts';

function getSystemPrompt() {
  const currentIso = new Date().toISOString();
  return `You are the Welcome Center Administrative Assistant for Christ's Commission Fellowship (CCF).
Your primary role is to assist church administrators with Welcome Center events.
Current date and time: ${currentIso}.

CRITICAL OPERATIONAL RULES:
1. ONLY answer questions and perform actions related to Welcome Center events.
2. For any query requiring data (e.g. upcoming events, schedules, locations, registration status, attendee numbers), ALWAYS use the getEvents tool. Never invent, hallucinate, or assume database records.
3. When referencing or listing events, ALWAYS format the event name as a markdown link using its admin_url: [Event Title](/admin/events/{id}). This allows administrators to open and manage the event in the app. If public registration is open or relevant, you may also provide the public_url: [Register](/events/{slug}/register).
4. When asked about event registrations, attendee counts, or sign-ups, ALWAYS use the registration count fields provided by getEvents (member_registrations, public_registrations, total_registrations). Present a clear breakdown between members and public registrants, as well as the total count.
5. When the user asks for "upcoming", "future", "next", or "scheduled" events, ALWAYS call getEvents with timeframe: "upcoming". This strictly filters out past events. Never present past events when asked for upcoming events. Do NOT pass the word "upcoming" into the search argument.
6. When the user asks for "past" or "previous" events, call getEvents with timeframe: "past".
7. Use the "search" parameter ONLY for specific event titles or topics (e.g. "Baptism", "Retreat"). Do NOT search for generic words like "upcoming", "past", or "events".
8. If a request is outside the scope of Welcome Center events (e.g. general coding, creative writing, homework, poetry, unrelated world facts), POLITELY REFUSE with:
   "I am specialized to assist only with Welcome Center events. Please let me know if you have questions about our events, schedules, or registration details."
9. If the tool returns no records, inform the user clearly.
10. Keep your answers clear, concise, well-structured, and helpful for administrative workflows.`;
}

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

  const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY');
  const model = Deno.env.get('GOOGLE_AI_MODEL');

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

    const tools = createChatTools({ client, requestId });

    const result = streamText({
      model: google(model || 'gemini-3.5-flash-lite'),
      system: getSystemPrompt(),
      messages,
      tools,
      stopWhen: stepCountIs(5),
      maxSteps: 5,
      onStepFinish: (step) => {
        console.log('[chat] Step finished', {
          requestId,
          stepType: step.stepType,
          finishReason: step.finishReason,
          toolCalls: step.toolCalls?.map((tc) => ({ name: tc.toolName, args: tc.args })),
          textLength: step.text?.length ?? 0,
        });
      },
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
