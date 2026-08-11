import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import {
  errorResponse as sharedErrorResponse,
  successResponse as sharedSuccessResponse,
} from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const schema = z.object({
  event_id: z.string().uuid('event_id must be a valid UUID'),
  audience: z.enum(['members', 'guests']).optional(),
});

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'get-public-event-fields',
    method: 'POST',
    schema,
    publicRateLimit: { scope: 'ip', ...RATE_LIMIT_PRESETS.getPublicEventFields },
  });

  const corsHeaders = guard.corsHeaders;
  if (!guard.valid) return guard.response;

  const { event_id, audience } = guard.data;
  const client = guard.client;

  const { data: event, error: eventError } = await client
    .from('events')
    .select('id')
    .eq('id', event_id)
    .eq('status', 'published')
    .maybeSingle();

  if (eventError) {
    return sharedErrorResponse(corsHeaders, 500, 'Failed to fetch event', eventError.message);
  }

  if (!event) {
    return sharedSuccessResponse(corsHeaders, { fields: [] });
  }

  let query = client
    .from('event_fields')
    .select(
      'id, event_id, field_key, label, field_type, applicability, is_required, is_active, placeholder, help_text, options, validation_rules, display_order',
    )
    .eq('event_id', event_id)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (audience === 'members') {
    query = query.in('applicability', ['members', 'both']);
  }

  if (audience === 'guests') {
    query = query.in('applicability', ['guests', 'both']);
  }

  const { data: fields, error } = await query;

  if (error) {
    return sharedErrorResponse(corsHeaders, 500, 'Failed to fetch event fields', error.message);
  }

  return sharedSuccessResponse(corsHeaders, { fields: fields ?? [] });
});
