import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const listAttendeesRequestSchema = z.object({
  event_id: z.string().uuid('Invalid event ID.'),
});

type ListAttendeesRequest = z.infer<typeof listAttendeesRequestSchema>;

type ListAttendeesRpcRow = {
  attendance_enabled: boolean;
  results: unknown;
};

function logListAttendeesError(stage: string, error: unknown, context?: Record<string, unknown>) {
  const errorDetails = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};

  console.error('[list-attendees-v2] error', {
    stage,
    error,
    supabaseStatus: errorDetails.status,
    supabaseCode: errorDetails.code,
    supabaseDetails: errorDetails.details,
    supabaseHint: errorDetails.hint,
    ...(context ?? {}),
  });
}

Deno.serve(async (req) => {
  try {
    const guard = await useEdgeHook({
      req,
      functionName: 'list-attendees-v2',
      method: 'POST',
      requireAdmin: true,
      rateLimit: {
        scope: 'list-attendees',
        windowMs: RATE_LIMIT_PRESETS.listAttendees.windowMs,
        maxHits: RATE_LIMIT_PRESETS.listAttendees.maxHits,
      },
      schema: listAttendeesRequestSchema,
    });

    const corsHeaders = guard.corsHeaders;

    if (!guard.valid) {
      return guard.response;
    }

    const { event_id }: ListAttendeesRequest = guard.data;
    const adminClient = guard.client;

    const rpc = adminClient.rpc.bind(adminClient) as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => { single: () => PromiseLike<{ data: unknown; error: unknown }> };

    const { data: rpcData, error: rpcError } = await rpc('list_event_attendees_v2', {
      p_event_id: event_id,
    }).single();

    if (rpcError) {
      logListAttendeesError('load_attendee_payload', rpcError, { event_id });
      return errorResponse(corsHeaders, 500, 'Failed to load attendee details', undefined, {
        error_code: 'ATTENDEE_DETAILS_LOOKUP_FAILED',
      });
    }

    const payload = rpcData as ListAttendeesRpcRow | null;
    if (!payload?.attendance_enabled) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'Attendance tracking is disabled for this event.',
          error_code: 'ATTENDANCE_DISABLED',
        },
        400,
      );
    }

    const results = Array.isArray(payload.results) ? payload.results : [];
    return jsonResponse(corsHeaders, { success: true, results }, 200);
  } catch (error) {
    logListAttendeesError('unhandled_exception', error);
    throw error;
  }
});
