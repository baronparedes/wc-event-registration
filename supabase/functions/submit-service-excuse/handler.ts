import { RATE_LIMIT_PRESETS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { escapeHtml } from '../_shared/emailTemplate.ts';
import { decodeMemberLookupToken } from '../_shared/memberLookupToken.ts';
import { sendResendEmail } from '../_shared/resend.ts';
import { z } from '../_shared/validation.ts';

export const submitServiceExcuseRequestSchema = z
  .object({
    member_token: z.string().trim().optional(),
    member_id: z.string().trim().optional(),
    user_id: z.string().uuid().optional(),
    request_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Request date must be in YYYY-MM-DD format')
      .optional(),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .optional(),
    is_long_leave: z.boolean().optional(),
    services: z.array(z.string().trim().min(1)).min(1, 'At least one service slot is required'),
    reason: z
      .string()
      .trim()
      .max(500, 'Reason must be 500 characters or less')
      .optional()
      .nullable(),
    assigned_to_email: z.string().trim().email().optional().nullable(),
  })
  .refine((data) => Boolean(data.member_token || data.member_id || data.user_id), {
    message: 'Either member_token, member_id, or user_id must be provided',
    path: ['member_id'],
  })
  .refine((data) => Boolean(data.request_date || (data.start_date && data.end_date)), {
    message: 'Either request_date or both start_date and end_date must be provided',
    path: ['request_date'],
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

  const {
    member_token,
    member_id,
    user_id,
    request_date,
    start_date,
    end_date,
    is_long_leave,
    services,
    reason,
    assigned_to_email,
  } = guard.data;
  const supabase = guard.client;

  let targetUserId: string | null = null;
  let targetMemberId: string | null = null;
  let targetUserFullName: string | null = null;
  let targetUserEmail: string | null = null;

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
      .select('id, member_id, is_active, full_name, email')
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
    targetUserFullName = user.full_name;
    targetUserEmail = user.email;
  } else if (guard.userId) {
    // Authenticated user session
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, member_id, is_active, full_name, email')
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
    targetUserFullName = user.full_name;
    targetUserEmail = user.email;
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
      .select('id, member_id, is_active, full_name, email')
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
    targetUserFullName = user.full_name;
    targetUserEmail = user.email;
  } else if (user_id) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, member_id, is_active, full_name, email')
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
    targetUserFullName = user.full_name;
    targetUserEmail = user.email;
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

  const startDate = start_date || request_date!;
  const endDate = end_date || request_date!;
  const effectiveRequestDate = request_date || start_date!;
  const isLongLeave = Boolean(is_long_leave || (start_date && end_date && start_date !== end_date));
  const excuseStatus = isLongLeave ? 'pending' : 'approved';

  // Long leave requests cannot be public - must be signed in user or admin
  const authHeader = req.headers.get('authorization');
  if (isLongLeave && !authHeader) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          'Long leave requests cannot be submitted publicly. Please sign in or contact an administrator.',
        error_code: 'UNAUTHORIZED_LONG_LEAVE',
      }),
      {
        status: 401,
        headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // Check if an excuse request already exists for this date/range
  const { data: existing, error: existingError } = await supabase
    .from('service_excuse_requests')
    .select('id, status')
    .eq('user_id', targetUserId)
    .eq('request_date', effectiveRequestDate)
    .in('status', ['approved', 'pending'])
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
        start_date: startDate,
        end_date: endDate,
        is_long_leave: isLongLeave,
        status: excuseStatus,
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
        request_date: effectiveRequestDate,
        start_date: startDate,
        end_date: endDate,
        is_long_leave: isLongLeave,
        services,
        reason: reason ?? null,
        status: excuseStatus,
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

  // If long leave, create approval_requests record
  if (isLongLeave && resultRecord) {
    const requesterName = targetUserFullName || targetMemberId;
    const { data: approvalRecord, error: approvalErr } = await supabase
      .from('approval_requests')
      .insert({
        entity_type: 'service_excuse',
        entity_id: resultRecord.id,
        status: 'pending',
        title: 'Long Leave Request',
        summary: `Leave from ${startDate} to ${endDate} (${services.join(', ')})`,
        requester_user_id: targetUserId,
        requester_name: requesterName,
        requester_email: targetUserEmail,
        assigned_to_email: assigned_to_email || null,
        metadata: JSON.parse(
          JSON.stringify({
            start_date: startDate,
            end_date: endDate,
            services,
            reason,
          }),
        ),
      })
      .select('id, access_token')
      .single();

    if (!approvalErr && approvalRecord) {
      await supabase
        .from('service_excuse_requests')
        .update({ approval_request_id: approvalRecord.id })
        .eq('id', resultRecord.id);

      if (assigned_to_email) {
        const appUrl = (
          Deno.env.get('APP_URL') ||
          Deno.env.get('PUBLIC_APP_URL') ||
          'https://welcomehub.app'
        ).replace(/\/+$/, '');
        const reviewUrl = `${appUrl}/approvals/review/${approvalRecord.access_token}`;

        try {
          await sendResendEmail({
            to: assigned_to_email,
            subject: `[Approval Required] Long Leave Request - ${requesterName}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #1f2937; margin-top: 0;">Long Leave Approval Required</h2>
                <p style="font-size: 15px; color: #374151;">A volunteer has submitted an extended leave request requiring your sign-off:</p>
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0 0 8px 0;"><strong>Volunteer:</strong> ${escapeHtml(requesterName)} (${escapeHtml(targetMemberId)})</p>
                  <p style="margin: 0 0 8px 0;"><strong>Duration:</strong> ${escapeHtml(startDate)} to ${escapeHtml(endDate)}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Services:</strong> ${escapeHtml(services.join(', '))}</p>
                  ${reason ? `<p style="margin: 0;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ''}
                </div>
                <div style="margin-top: 24px; text-align: center;">
                  <a href="${reviewUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                    Review & Take Action
                  </a>
                </div>
                <p style="margin-top: 24px; font-size: 13px; color: #6b7280; text-align: center;">
                  Or copy this review link: <br /><a href="${reviewUrl}" style="color: #4f46e5;">${reviewUrl}</a>
                </p>
              </div>
            `,
            text: `Long Leave Approval Required\n\nVolunteer: ${requesterName}\nDates: ${startDate} to ${endDate}\nServices: ${services.join(', ')}\n\nReview link: ${reviewUrl}`,
            targetType: 'approval-request',
          });
        } catch (emailErr) {
          console.error('Failed to dispatch long leave approval email:', emailErr);
        }
      }
    }
  }

  const successMessage = isLongLeave
    ? 'Long leave request submitted and is pending approval'
    : 'Excuse request submitted successfully';

  return new Response(
    JSON.stringify({
      success: true,
      excuse: resultRecord,
      message: successMessage,
    }),
    {
      status: 200,
      headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}
