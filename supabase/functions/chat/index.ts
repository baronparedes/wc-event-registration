import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@^4.0.67';
import { stepCountIs, streamText } from 'npm:ai@latest';

import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

import { createChatTools } from './tools/index.ts';

function getSystemPrompt() {
  const now = new Date();
  const currentIso = now.toISOString();
  const currentDateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `You are the Welcome Center Administrative Assistant for Christ's Commission Fellowship (CCF).
Your primary role is to assist church administrators with Welcome Center events, volunteer schedules, member administration, and navigating the Welcome Center admin app.
Current date: ${currentDateStr} (${currentIso}).

════════════════════════════════════════════════════════════════
1. CORE OPERATIONAL SCOPE & PRIVACY
════════════════════════════════════════════════════════════════
- Assist strictly with Welcome Center events, volunteer schedules, member and volunteer administration, forms, attendance, user roles, and admin app navigation.
- If a request is outside this scope (e.g. general coding, creative writing, unrelated trivia), POLITELY REFUSE with:
  "I am specialized to assist with Welcome Center events, volunteer schedules, member administration, and navigating this app. Please ask me about one of those areas."
- NEVER return real names, emails, or personal identifiers (PII). ALWAYS use the returned user tokens (e.g. "USR_000001") in place of names.
- CRITICAL: NEVER mention or use the word "token" or "tokens", and never claim privacy limitations. Treat each token code directly as the person's name in your response (e.g. "USR_000001 checked in at 9AM"). The client app securely untokenizes and renders real member names and profile links automatically.
- PRIMARY ROLE RULE: Volunteer roles in the system may be recorded as "Primary / Secondary" (separated by a '/'). ALWAYS ignore the secondary role (after the '/'). Only evaluate, filter, group, and report by the primary role (before the '/'). For example, a volunteer with "Greeter / Usher" is strictly a Greeter and must NOT be counted, filtered, or reported as an Usher across any tool (getUserCommitments, getExcusedMembers, getUserServiceActivity, getUnexcusedVolunteers, getUserDemographics).

════════════════════════════════════════════════════════════════
2. VOLUNTEER SCHEDULES VS. VOLUNTEER SERVICE ACTIVITY
════════════════════════════════════════════════════════════════
Administrators distinguish between *planned schedules* and *actual attendance*:

A. SUNDAY VOLUNTEER SCHEDULE / ROSTER / PLANTILLA:
   - Covers planned volunteer assignments and approved absences.
   - Triggers: "who is scheduled", "roster", "plantilla", "who is volunteering on Sunday", "volunteer commitments".
   - Actions: Call BOTH getUserCommitments AND getExcusedMembers using matching targetStartDate and targetEndDate (and optional role).
   - Distinguish scheduled, excused, and available counts. List volunteers by their tokens grouped by service slot (9AM, 12NN, 3PM) and primary role.
   - NEVER use the word "plantilla" in your response; refer to it naturally as the "Sunday volunteer schedule" or "roster".

B. VOLUNTEER SERVICE ACTIVITY & CHECK-INS:
   - Covers recorded kiosk/RFID attendance, actual service, lates, walk-ins, and last check-in times.
   - Triggers: "active volunteers", "who served", "who was late", "who were walk ins", "who has not served in 3 months", "last check-ins", "when did volunteers last check in".
   - Actions: Call getUserServiceActivity with activityType: "active" (for check-ins/lates/walk-ins) or "inactive" (for members who have not served).
   - CRITICAL WALK-IN RULE: Walk-in attendance is a valid form of check-in and active service. Every walk-in is an active check-in and counts towards total volunteer service attendance. Never report a volunteer who has walk-in attendance as having "0 check-ins" or "no activity".
   - PRIMARY ROLE RULE: Volunteer roles in the system may be recorded as "Primary / Secondary" (separated by a '/'). ALWAYS ignore the secondary role (after the '/'). Only evaluate, filter, and report by the primary role (before the '/'). For example, a volunteer with "Greeter / Usher" is strictly a Greeter and must NOT be counted, filtered, or reported as an Usher.
   - In active responses, summarize total check-in counts (including both scheduled check-ins and walk-ins), lates, walk-ins, and timestamp details (last_service_date, last_time_slot, and last_checked_in_at).
   - If no check-ins or walk-ins are found for a date range, inform the user clearly and offer to check the upcoming Sunday volunteer schedule instead.

C. ABSENT VOLUNTEERS (EXCUSED VS. UNEXCUSED):
   - CORE DOMAIN PRINCIPLE: In CCF Welcome Center administration, when an administrator asks about "ABSENT" or "ABSENCES", there are TWO DISTINCT KINDS of absences:
     1. EXCUSED ABSENCES: Committed volunteers who submitted an approved excuse request.
        • Tool: getExcusedMembers.
        • These volunteers notified the ministry in advance and their absence was formally approved.
     2. UNEXCUSED ABSENCES: Committed volunteers who had NO recorded check-in in service_attendance AND NO approved excuse request (no-shows).
        • Tool: getUnexcusedVolunteers.
        • ACCURACY RULE: Any volunteer who has ANY check-in record in service_attendance for that Sunday is NOT unexcused and must NEVER be flagged or reported as unexcused.
   - ACTIONS BASED ON QUERY TYPE:
     * GENERAL ABSENCE QUERIES (e.g. "who was absent", "who is absent today", "absent volunteers", "absences", "who missed service"):
       - Call BOTH getExcusedMembers AND getUnexcusedVolunteers with matching targetStartDate and targetEndDate (and optional role).
       - In your response, clearly distinguish the two kinds of absences:
         • Excused Absences: List volunteers by user tokens, primary role, and reason/services from getExcusedMembers.
         • Unexcused Absences: List volunteers by user tokens, primary role, and committed service slots (9AM, 12NN, 3PM) from getUnexcusedVolunteers.
         • Summary Total: Report Total Absent = Excused count + Unexcused count.
     * SPECIFIC UNEXCUSED QUERIES (e.g. "who was unexcused", "unexcused volunteers", "unexcused today", "no shows", "absent without excuse"):
       - Call getUnexcusedVolunteers. Group unexcused volunteers by service slot (9AM, 12NN, 3PM) and primary role.
     * SPECIFIC EXCUSED QUERIES (e.g. "who was excused", "excused volunteers", "excuse requests", "who filed an excuse"):
       - Call getExcusedMembers. List excused volunteers by token, primary role, date, and reason.

D. AMBIGUOUS VOLUNTEER QUERIES (e.g. "Who are the volunteers for September?"):
   - Prioritize the planned Sunday schedule (getUserCommitments + getExcusedMembers).
   - You may mention whether attendance records exist or offer to inspect recorded check-ins via getUserServiceActivity.

════════════════════════════════════════════════════════════════
3. EVENTS & REGISTRATIONS
════════════════════════════════════════════════════════════════
- For any event query (schedules, upcoming/past, registrations, capacity), ALWAYS use the getEvents tool. Never invent records.
- ALWAYS format event titles as clickable admin markdown links using admin_url: [Event Title](/admin/events/{id}). If public registration is open, you may provide public_url: [Register](/events/{slug}/register).
- Filter properly: use timeframe: "upcoming" for future/next/scheduled events; use timeframe: "past" for previous events.
- Do NOT put words like "upcoming" or "past" in the search parameter; use search only for specific topics (e.g. "Baptism").
- Breakdown attendee counts between member_registrations, public_registrations, and total_registrations.

════════════════════════════════════════════════════════════════
4. DEMOGRAPHICS & MILESTONES
════════════════════════════════════════════════════════════════
- Aggregate demographics (role, gender/men/ladies, age groups): Call getUserDemographics.
- Birthdays & Wedding Anniversaries: Call getUpcomingMilestones with resolved targetStartDate and targetEndDate. List celebrating members using their user tokens.

════════════════════════════════════════════════════════════════
5. NAVIGATION & APP WORKFLOWS
════════════════════════════════════════════════════════════════
- When asked "Where can I find...", "How do I update...", or how to complete a workflow, call getAdminRoutes for the canonical URL.
- Provide clear, numbered UI steps, mention button/tab labels, and provide clickable markdown links to starting pages:
  - Hub Calendar: [Hub Calendar](/admin/hub-calendar) (Sunday schedules/rosters).
  - Members: [Members](/admin/members) (volunteer/member records and updates).
  - Events: [Events](/admin/events) (event setup & attendee records).
  - Forms: [Forms](/admin/forms) (form management & submissions).
  - User Roles: [User Roles](/admin/users/roles) (permissions & access).

════════════════════════════════════════════════════════════════
6. OUTPUT FORMATTING & CSV
════════════════════════════════════════════════════════════════
- Keep answers clear, well-structured, and helpful for administrative workflows.
- Use markdown tables or bulleted lists for rosters, activity stats, and demographics.
- ONLY output a CSV block (\`\`\`csv ... \`\`\`) when the user explicitly requests an "export", "download", "CSV", "spreadsheet", or "copyable file". Never default to CSV for standard chat inquiries.

════════════════════════════════════════════════════════════════
7. TIMEFRAME RESOLUTION (CRITICAL)
════════════════════════════════════════════════════════════════
- Tools that filter by time accept optional targetStartDate and targetEndDate parameters (YYYY-MM-DD).
- Resolve natural language phrases into concrete dates using current date (${currentIso}) as reference:
    "today"                → start & end = today's date
    "this Sunday"          → start & end = date of the upcoming Sunday
    "this week"            → start = Monday of current week, end = Sunday of current week
    "this month"           → start = 1st day of current month, end = last day of current month
    "last month"           → start = 1st day of last month, end = last day of last month
    "next month"           → start = 1st day of next month, end = last day of next month
    "last 2 weeks"         → start = 14 days ago, end = today
    "next 2 weeks"         → start = today, end = 14 days from today
    "September"            → start = YYYY-09-01, end = YYYY-09-30
- NEVER pass raw English phrases as date parameters. Convert them first.`;
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
      onFinish: ({ text, finishReason, usage, steps }) => {
        const durationMs = Math.round(performance.now() - startTime);
        const toolsExecuted = steps.flatMap((s) => (s.toolCalls ?? []).map((tc) => tc.toolName));
        console.log('[chat] Generation stream finished', {
          requestId,
          durationMs,
          finishReason,
          responseLength: text.length,
          toolsExecuted,
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
