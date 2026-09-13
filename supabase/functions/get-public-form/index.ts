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
    functionName: 'get-public-form',
    method: 'POST',
    schema,
    publicRateLimit: { scope: 'ip', ...RATE_LIMIT_PRESETS.getPublicForm },
  });

  const corsHeaders = guard.corsHeaders;
  if (!guard.valid) return guard.response;

  const { slug } = guard.data;
  const client = guard.client;

  const { data: form, error } = await client
    .from('forms')
    .select(
      'id, slug, title, description, status, duplicate_policy, audience, metadata, created_at, updated_at',
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    return sharedErrorResponse(corsHeaders, 500, 'Failed to fetch form', error.message);
  }

  return sharedSuccessResponse(corsHeaders, { form: form ?? null });
});
