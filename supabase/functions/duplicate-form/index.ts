import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const duplicateFormSchema = z.object({
  source_form_id: z.string().uuid('Invalid source form ID.'),
  new_title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  new_slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Slug must use only lowercase letters, numbers, and hyphens'),
});

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'duplicate-form',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'duplicate-form',
      windowMs: RATE_LIMIT_PRESETS.duplicateForm.windowMs,
      maxHits: RATE_LIMIT_PRESETS.duplicateForm.maxHits,
    },
    schema: duplicateFormSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const payload = guard.data;
    const adminClient = guard.client;

    const rpc = adminClient.rpc.bind(adminClient) as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: string | null; error: { message?: string; code?: string } | null }>;

    const { data: newFormId, error: rpcError } = await rpc('duplicate_form', {
      p_source_form_id: payload.source_form_id,
      p_new_title: payload.new_title,
      p_new_slug: payload.new_slug,
      p_admin_auth_user_id: guard.session?.user?.id ?? null,
    });

    if (rpcError) {
      const message = rpcError.message || '';
      const code = rpcError.code || '';

      if (
        code === '23505' ||
        message.includes('DUPLICATE_SLUG') ||
        message.includes('forms_slug_unique_idx')
      ) {
        return jsonResponse(
          corsHeaders,
          {
            success: false,
            error: 'A form with this slug already exists. Please choose a different slug.',
            error_code: 'DUPLICATE_SLUG',
          },
          400,
        );
      }

      if (code === 'P0002' || message.includes('SOURCE_FORM_NOT_FOUND')) {
        return errorResponse(corsHeaders, 404, 'Source form not found', message);
      }

      return errorResponse(corsHeaders, 500, 'Failed to duplicate form', message);
    }

    if (!newFormId) {
      return errorResponse(corsHeaders, 500, 'Failed to create new form');
    }

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        new_form_id: newFormId,
      },
      200,
    );
  } catch {
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
