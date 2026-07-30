import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import {
  errorResponse as sharedErrorResponse,
  successResponse as sharedSuccessResponse,
} from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const schema = z.object({
  event_id: z.string().uuid('event_id must be a valid UUID'),
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

  const { event_id } = guard.data;
  const client = guard.client;

  const { data: fields, error } = await client
    .from('event_fields')
    .select(
      'id, event_id, field_key, label, field_type, is_required, is_active, placeholder, help_text, options, validation_rules, display_order',
    )
    .eq('event_id', event_id)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    return sharedErrorResponse(corsHeaders, 500, 'Failed to fetch event fields', error.message);
  }

  return sharedSuccessResponse(corsHeaders, { fields: fields ?? [] });
});
