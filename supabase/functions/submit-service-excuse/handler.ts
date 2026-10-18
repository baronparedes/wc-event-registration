import { createApprovalRequest, enqueueApprovalReviewEmail } from '../_shared/approvals.ts';
import { RATE_LIMIT_PRESETS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { resolveMemberUser } from '../_shared/memberResolution.ts';
import { z } from '../_shared/validation.ts';
import { linkApprovalToExcuse, upsertServiceExcuse } from './serviceExcuseService.ts';

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

  // 1. Resolve member account identity
  const memberResult = await resolveMemberUser(supabase, {
    member_token,
    member_id,
    user_id,
    authUserId: guard.userId,
  });

  if (!memberResult.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: memberResult.error,
        error_code: memberResult.errorCode,
      }),
      {
        status: memberResult.status,
        headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const { userId, memberId, fullName, email } = memberResult.user;
  const startDate = start_date || request_date!;
  const endDate = end_date || request_date!;
  const effectiveRequestDate = request_date || start_date!;
  const isLongLeave = Boolean(is_long_leave || (start_date && end_date && start_date !== end_date));
  const excuseStatus = isLongLeave ? 'pending' : 'approved';

  // 2. Long leave requests cannot be submitted publicly (must have auth header)
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

  // 3. Upsert excuse request
  const excuseResult = await upsertServiceExcuse(supabase, {
    userId,
    memberId,
    requestDate: effectiveRequestDate,
    startDate,
    endDate,
    isLongLeave,
    services,
    reason,
    status: excuseStatus,
  });

  if (!excuseResult.record) {
    return new Response(
      JSON.stringify({
        success: false,
        error: excuseResult.error,
        error_code: excuseResult.errorCode,
      }),
      {
        status: 500,
        headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // 4. For long leave requests, trigger approval workflow and notify assigned reviewer
  if (isLongLeave) {
    const requesterName = fullName || memberId;
    const approvalResult = await createApprovalRequest(supabase, {
      entityType: 'service_excuse',
      entityId: excuseResult.record.id,
      title: 'Long Leave Request',
      summary: `Leave from ${startDate} to ${endDate} (${services.join(', ')})`,
      requesterUserId: userId,
      requesterName,
      requesterEmail: email,
      assignedToEmail: assigned_to_email || null,
      metadata: {
        start_date: startDate,
        end_date: endDate,
        services,
        reason,
      },
    });

    if (approvalResult.success && approvalResult.approval) {
      await linkApprovalToExcuse(supabase, excuseResult.record.id, approvalResult.approval.id);

      if (assigned_to_email) {
        try {
          const details = [
            { label: 'Volunteer', value: `${requesterName} (${memberId})` },
            { label: 'Duration', value: `${startDate} to ${endDate}` },
            { label: 'Services', value: services.join(', ') },
          ];
          if (reason) {
            details.push({ label: 'Reason', value: reason });
          }

          await enqueueApprovalReviewEmail(supabase, {
            assignedToEmail: assigned_to_email,
            subjectTitle: `Long Leave Request - ${requesterName}`,
            heading: 'Long Leave Approval Required',
            description:
              'A volunteer has submitted an extended leave request requiring your sign-off:',
            details,
            accessToken: approvalResult.approval.access_token,
            approvalId: approvalResult.approval.id,
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
      excuse: excuseResult.record,
      message: successMessage,
    }),
    {
      status: 200,
      headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}
