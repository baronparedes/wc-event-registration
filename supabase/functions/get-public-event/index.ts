import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import {
  errorResponse as sharedErrorResponse,
  successResponse as sharedSuccessResponse,
} from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const schema = z.object({
  slug: z.string().trim().min(1),
});

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'get-public-event',
    method: 'POST',
    schema,
    publicRateLimit: { scope: 'ip', ...RATE_LIMIT_PRESETS.getPublicEvent },
  });

  const corsHeaders = guard.corsHeaders;
  if (!guard.valid) return guard.response;

  const { slug } = guard.data;
  const client = guard.client;

  const { data: event, error } = await client
    .from('events')
    .select(
      'id, slug, title, description, location, starts_at, ends_at, registration_opens_at, registration_closes_at, require_id_lookup, registration_mode, allow_public_registrations, metadata',
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    return sharedErrorResponse(corsHeaders, 500, 'Failed to fetch event', error.message);
  }

  if (!event) {
    return sharedSuccessResponse(corsHeaders, { event: null, registration_count: 0 });
  }

  const { data: countData } = await client.rpc('get_total_event_registration_count', {
    p_event_id: event.id,
  });

  const registrationCount = typeof countData === 'number' ? countData : 0;

  return sharedSuccessResponse(corsHeaders, {
    event,
    registration_count: registrationCount,
  });
});
