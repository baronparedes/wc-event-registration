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
    functionName: 'get-public-forms',
    method: 'POST',
    schema,
    publicRateLimit: { scope: 'ip', ...RATE_LIMIT_PRESETS.getPublicForms },
  });

  const corsHeaders = guard.corsHeaders;
  if (!guard.valid) return guard.response;

  const client = guard.client;

  const { data: forms, error } = await client
    .from('forms')
    .select(
      'id, slug, title, description, status, duplicate_policy, audience, metadata, created_at, updated_at',
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    return sharedErrorResponse(corsHeaders, 500, 'Failed to fetch form listing', error.message);
  }

  return sharedSuccessResponse(corsHeaders, { forms: forms ?? [] });
});
