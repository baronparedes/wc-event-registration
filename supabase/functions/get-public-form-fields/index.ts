import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import {
  errorResponse as sharedErrorResponse,
  successResponse as sharedSuccessResponse,
} from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const schema = z.object({
  form_id: z.string().uuid('form_id must be a valid UUID'),
  audience: z.enum(['members', 'public']).optional(),
});

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'get-public-form-fields',
    method: 'POST',
    schema,
    publicRateLimit: { scope: 'ip', ...RATE_LIMIT_PRESETS.getPublicFormFields },
  });

  const corsHeaders = guard.corsHeaders;
  if (!guard.valid) return guard.response;

  const { form_id, audience } = guard.data;
  const client = guard.client;

  const { data: form, error: formError } = await client
    .from('forms')
    .select('id')
    .eq('id', form_id)
    .eq('status', 'published')
    .maybeSingle();

  if (formError) {
    return sharedErrorResponse(corsHeaders, 500, 'Failed to fetch form', formError.message);
  }

  if (!form) {
    return sharedSuccessResponse(corsHeaders, { fields: [] });
  }

  let query = client
    .from('form_fields')
    .select(
      'id, form_id, field_key, label, field_type, is_required, is_active, placeholder, help_text, options, validation_rules, field_applicability, display_order, created_at, updated_at',
    )
    .eq('form_id', form_id)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (audience === 'members') {
    query = query.in('field_applicability', ['all', 'member_only']);
  }

  if (audience === 'public') {
    query = query.in('field_applicability', ['all', 'public_only']);
  }

  const { data: fields, error } = await query;

  if (error) {
    return sharedErrorResponse(corsHeaders, 500, 'Failed to fetch form fields', error.message);
  }

  return sharedSuccessResponse(corsHeaders, { fields: fields ?? [] });
});
