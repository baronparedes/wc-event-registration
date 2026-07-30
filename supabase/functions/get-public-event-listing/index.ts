import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import {
  errorResponse as sharedErrorResponse,
  successResponse as sharedSuccessResponse,
} from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const schema = z.object({});

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'get-public-event-listing',
    method: 'POST',
    schema,
    publicRateLimit: { scope: 'ip', ...RATE_LIMIT_PRESETS.getPublicEventListing },
  });

  const corsHeaders = guard.corsHeaders;
  if (!guard.valid) return guard.response;

  const client = guard.client;

  const { data: events, error } = await client
    .from('events')
    .select(
      'id, slug, title, description, location, starts_at, ends_at, registration_opens_at, registration_closes_at, allow_public_registrations',
    )
    .eq('status', 'published')
    .order('starts_at', { ascending: true });

  if (error) {
    return sharedErrorResponse(corsHeaders, 500, 'Failed to fetch event listing', error.message);
  }

  return sharedSuccessResponse(corsHeaders, { events: events ?? [] });
});
