import { RATE_LIMIT_PRESETS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { decodeMemberLookupToken } from '../_shared/memberLookupToken.ts';
import { z } from '../_shared/validation.ts';

export const submitServiceExcuseRequestSchema = z
  .object({
    member_token: z.string().trim().optional(),
    member_id: z.string().trim().optional(),
    user_id: z.string().uuid().optional(),
    request_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Request date must be in YYYY-MM-DD format'),
    services: z.array(z.string().trim().min(1)).min(1, 'At least one service slot is required'),
    reason: z
      .string()
      .trim()
      .max(500, 'Reason must be 500 characters or less')
      .optional()
      .nullable(),
  })
  .refine((data) => Boolean(data.member_token || data.member_id || data.user_id), {
    message: 'Either member_token, member_id, or user_id must be provided',
    path: ['member_id'],
  });

export type SubmitServiceExcuseRequest = z.infer<typeof submitServiceExcuseRequestSchema>;

export async function handleSubmitServiceExcuse(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'submit-service-excuse',
    method: 'POST',
    schema: submitServiceExcuseRequestSchema,
    publicRateLimit: {
      scope: 'submit-service-excuse',
      windowMs: RATE_LIMIT_PRESETS.submitRegistration.windowMs,
      maxHits: RATE_LIMIT_PRESETS.submitRegistration.maxHits,
    },
  });

  if (!guard.valid) {
    return guard.response;
  }

  const { member_token, member_id, user_id, request_date, services, reason } = guard.data;
  const supabase = guard.client;

  let targetUserId: string | null = null;
  let targetMemberId: string | null = null;

  // 1. Resolve member from member_token if provided
  if (member_token) {
    const decoded = await decodeMemberLookupToken(member_token);
    if (!decoded?.memberId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or expired member token. Please look up your member ID again.',
          error_code: 'INVALID_TOKEN',
        }),
        {
          status: 400,
          headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, member_id, is_active')
      .eq('member_id', decoded.memberId)
      .maybeSingle();

    if (userError || !user || !user.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Member account not found or inactive',
          error_code: 'MEMBER_NOT_FOUND',
        }),
        {
          status: 404,
          headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    targetUserId = user.id;
    targetMemberId = user.member_id;
  } else if (guard.userId) {
    // Authenticated user session
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, member_id, is_active')
      .eq('id', guard.userId)
      .maybeSingle();

    if (userError || !user || !user.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Member account not found or inactive',
          error_code: 'MEMBER_NOT_FOUND',
        }),
        {
          status: 404,
          headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    targetUserId = user.id;
    targetMemberId = user.member_id;
  } else if (member_id) {
    let resolvedId = member_id;
    if (member_id.startsWith('mlt2.')) {
      const decoded = await decodeMemberLookupToken(member_id);
      if (!decoded?.memberId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid or expired member token',
            error_code: 'INVALID_TOKEN',
          }),
          {
            status: 400,
            headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
      resolvedId = decoded.memberId;
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, member_id, is_active')
      .eq('member_id', resolvedId)
      .maybeSingle();

    if (userError || !user || !user.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Member account not found or inactive',
          error_code: 'MEMBER_NOT_FOUND',
        }),
        {
          status: 404,
          headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    targetUserId = user.id;
    targetMemberId = user.member_id;
  } else if (user_id) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, member_id, is_active')
      .eq('id', user_id)
      .maybeSingle();

    if (userError || !user || !user.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Member account not found or inactive',
          error_code: 'MEMBER_NOT_FOUND',
        }),
        {
          status: 404,
          headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    targetUserId = user.id;
    targetMemberId = user.member_id;
  }

  if (!targetUserId || !targetMemberId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unable to resolve member account',
        error_code: 'MEMBER_RESOLUTION_FAILED',
      }),
      {
        status: 400,
        headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // Check if an approved excuse request already exists for this date
  const { data: existing, error: existingError } = await supabase
    .from('service_excuse_requests')
    .select('id')
    .eq('user_id', targetUserId)
    .eq('request_date', request_date)
    .eq('status', 'approved')
    .maybeSingle();

  if (existingError) {
    console.error('Error checking existing excuse:', existingError);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Database error checking existing excuse request',
        error_code: 'DB_ERROR',
      }),
      {
        status: 500,
        headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  let resultRecord;
  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('service_excuse_requests')
      .update({
        services,
        reason: reason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating excuse request:', updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to update excuse request',
          error_code: 'DB_UPDATE_ERROR',
        }),
        {
          status: 500,
          headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    resultRecord = updated;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('service_excuse_requests')
      .insert({
        user_id: targetUserId,
        member_id: targetMemberId,
        request_date,
        services,
        reason: reason ?? null,
        status: 'approved',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting excuse request:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to submit excuse request',
          error_code: 'DB_INSERT_ERROR',
        }),
        {
          status: 500,
          headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    resultRecord = inserted;
  }

  return new Response(
    JSON.stringify({
      success: true,
      excuse: resultRecord,
      message: 'Excuse request submitted successfully',
    }),
    {
      status: 200,
      headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}
