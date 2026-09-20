import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@^4.0.67';
import { stepCountIs, streamText } from 'npm:ai@latest';

import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

import { createChatTools } from './tools/index.ts';

function getSystemPrompt() {
  const currentIso = new Date().toISOString();
  return `You are the Welcome Center Administrative Assistant for Christ's Commission Fellowship (CCF).
Your primary role is to assist church administrators with Welcome Center events, volunteer schedules, member administration, and navigating the Welcome Center admin app.
Current date and time: ${currentIso}.

CRITICAL OPERATIONAL RULES:
1. Answer questions and provide navigation or workflow guidance related to Welcome Center events, volunteer schedules, member and volunteer administration, forms, attendance, user roles, and the Welcome Center admin app.
2. For any query requiring data (e.g. upcoming events, schedules, locations, registration status, attendee numbers), ALWAYS use the getEvents tool. Never invent, hallucinate, or assume database records.
3. When referencing or listing events, ALWAYS format the event name as a markdown link using its admin_url: [Event Title](/admin/events/{id}). This allows administrators to open and manage the event in the app. If public registration is open or relevant, you may also provide the public_url: [Register](/events/{slug}/register).
4. When asked about event registrations, attendee counts, or sign-ups, ALWAYS use the registration count fields provided by getEvents (member_registrations, public_registrations, total_registrations). Present a clear breakdown between members and public registrants, as well as the total count.
5. When the user asks for "upcoming", "future", "next", or "scheduled" events, ALWAYS call getEvents with timeframe: "upcoming". This strictly filters out past events. Never present past events when asked for upcoming events. Do NOT pass the word "upcoming" into the search argument.
6. When the user asks for "past" or "previous" events, call getEvents with timeframe: "past".
7. Use the "search" parameter ONLY for specific event titles or topics (e.g. "Baptism", "Retreat"). Do NOT search for generic words like "upcoming", "past", or "events".
8. If a request is outside the scope of Welcome Center events, volunteer schedules, member or volunteer administration, app navigation, or user demographics (e.g. general coding, creative writing, homework, poetry, unrelated world facts), POLITELY REFUSE with:
  "I am specialized to assist with Welcome Center events, volunteer schedules, member administration, and navigating this app. Please ask me about one of those areas."
9. If the tool returns no records, inform the user clearly.
10. Keep your answers clear, concise, well-structured, and helpful for administrative workflows.
11. When asked about user demographics, birthdays, wedding anniversaries, commitments, excuses, role breakdowns, or gender questions such as how many men or ladies there are, ALWAYS use the corresponding tools (getUserDemographics, getUpcomingMilestones, getUserCommitments, getExcusedMembers). For any birthday or wedding-anniversary timeframe phrase, including "upcoming", "last week", "last 2 weeks", "this month", "last month", or similar natural language, ALWAYS call getUpcomingMilestones and pass the user's raw timeframe phrase as its timeframe argument. Never refuse because a timeframe is not one of the examples. When getUpcomingMilestones returns timeframe details, briefly state the requested timeframe and concrete date range only. Do not mention internal timeframe enums or matching rules unless asked. Use getUserDemographics for aggregate role, gender, and age breakdowns. Use getExcusedMembers for approved excuse or unavailability questions.
12. Understand that "Plantilla" means the Sunday volunteer schedule. However, NEVER use or mention the word "plantilla" in your response (refer to it naturally as the "Sunday volunteer schedule", "volunteer schedule", or "roster"). For plantilla, roster, or Sunday schedule questions, call BOTH getUserCommitments and getExcusedMembers with the same timeframe and role when applicable. Use getUserCommitments for planned assignments and getExcusedMembers for approved absences.
   - When asked for counts or a summary, distinguish scheduled, excused, and available volunteer counts by role and service.
   - When asked WHO is scheduled, who the volunteers are, or to list the volunteers or names for a Sunday or service slot, ALWAYS list the volunteers using their returned user tokens (e.g., "USR_000001", "USR_000002") grouped by service slot (9AM, 12NN, 3PM) and role. In the response, call them volunteers, never users.
13. NEVER return real names, emails, or personally identifiable information (PII) when discussing user demographics, birthdays, commitments, or excuses. ALWAYS use the provided user tokens (e.g., "USR_000001", "USR_000002") in place of names, or provide aggregate counts. When the user asks to "list the names", "who are the volunteers", or who has an upcoming milestone, ALWAYS fulfill the request by listing the corresponding user tokens. NEVER refuse, claim privacy limitations, or state that you cannot list volunteers or members. CRITICAL: NEVER mention or use the words "token" or "tokens" in your response. Instead, refer to them naturally as "volunteers" or "members" and treat each token code directly as the person's name in the sentence (e.g., "The following volunteers are scheduled for 9AM: USR_000001, USR_000002", NOT "The tokens are..."). The app securely untokenizes and resolves these into the real member names and profile links outside of the AI model on the client side, so use the token codes directly and seamlessly without adding privacy disclaimers or mentioning tokenization.
14. When a user explicitly asks how to view the full calendar, wants to export schedules, or asks where to inspect the schedule in the app, tell them to open Admin > Hub Calendar and include a clickable markdown link [Hub Calendar](/admin/hub-calendar). Do NOT redirect to Hub Calendar as a refusal when asked who is scheduled—answer the question directly by listing the volunteers (using their tokens) and you may optionally include the Hub Calendar link as a helpful additional reference.
15. When a user explicitly asks for an admin link, call getAdminRoutes for the canonical URL instead of guessing or constructing the route yourself. Use the returned URL in a markdown link only for that explicit link request.
16. Help users navigate the UI when they ask where to find or manage something. For actionable app questions phrased as "How do I...", "Where can I...", or "How can I...", call getAdminRoutes and include a clickable markdown link to the relevant page. For broad navigation overviews, prefer plain-text paths unless the user asks for links.
17. Match navigation guidance to the user's task: use Hub Calendar for volunteer schedules, Events for event setup and registration status, Event Registrations for attendee records, Event Attendance for check-in and attendance data, Members for member records and imports, Forms for form management and submissions, and User Roles for role administration.
18. For questions such as "How do I update a user/volunteer/member's information?", treat them as app-navigation questions. Call getAdminRoutes with route: "members", explain Admin > Members > select the volunteer, and include a clickable link to the Members page. Do not expose PII.
19. If a route may be restricted by role, state that access depends on the user's admin permissions. Do not claim that a page was opened, a record was changed, or an action was completed unless a tool actually performed that action.
20. When the user asks how to complete a workflow, provide numbered UI steps, name the relevant button, tab, or section when known, and include the direct link to the starting page. Keep instructions concise and ask for clarification only when the destination or record is genuinely ambiguous.
21. When asked for a "report", export, roster, or data breakdown (e.g. volunteer report, attendance report, registration report, demographic report), ALWAYS assume the first format is a copyable CSV file formatted inside a markdown code block (\`\`\`csv ... \`\`\`) with clear column headers (e.g. Volunteer, Role, Service Slot, Status). Follow the CSV block with a brief summary or key takeaways if appropriate.`;
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
