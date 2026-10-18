import { RATE_LIMIT_PRESETS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { escapeHtml } from '../_shared/emailTemplate.ts';
import { sendResendEmail } from '../_shared/resend.ts';
import { z } from '../_shared/validation.ts';

export const processApprovalDecisionSchema = z
  .object({
    action: z.enum(['get_review_data', 'submit_decision']),
    token: z.string().trim().optional(),
    approval_id: z.string().uuid().optional(),
    decision: z.enum(['approved', 'rejected']).optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
    reviewer_email: z.string().trim().email().optional().nullable(),
  })
  .refine((data) => Boolean(data.token || data.approval_id), {
    message: 'Either token or approval_id must be provided',
    path: ['token'],
  })
  .refine((data) => data.action !== 'submit_decision' || Boolean(data.decision), {
    message: 'Decision (approved or rejected) is required when submitting a decision',
    path: ['decision'],
  });

export type ProcessApprovalDecisionRequest = z.infer<typeof processApprovalDecisionSchema>;

export async function handleProcessApprovalDecision(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'process-approval-decision',
    method: 'POST',
    schema: processApprovalDecisionSchema,
    publicRateLimit: {
      scope: 'process-approval-decision',
      windowMs: RATE_LIMIT_PRESETS.submitRegistration.windowMs,
      maxHits: RATE_LIMIT_PRESETS.submitRegistration.maxHits,
    },
  });

  if (!guard.valid) {
    return guard.response;
  }

  const { action, token, approval_id, decision, notes, reviewer_email } = guard.data;
  const supabase = guard.client;

  try {
    // 1. Fetch approval request
    let query = supabase.from('approval_requests').select('*');
    if (token) {
      query = query.eq('access_token', token);
    } else if (approval_id) {
      query = query.eq('id', approval_id);
    }

    const { data: approval, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      console.error('Error fetching approval request:', fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database error fetching approval request',
          error_code: 'DB_ERROR',
        }),
        {
          status: 500,
          headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!approval) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Approval request not found or invalid token',
          error_code: 'NOT_FOUND',
        }),
        {
          status: 404,
          headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const isExpired = approval.token_expires_at
      ? new Date(approval.token_expires_at) < new Date()
      : false;

    // 2. Handle Action: get_review_data
    if (action === 'get_review_data') {
      let entityDetails: Record<string, unknown> | null = null;

      if (approval.entity_type === 'form_submission') {
        const { data: submission } = await supabase
          .from('form_submissions')
          .select(
            `
            id,
            status,
            source,
            submitted_at,
            public_registrant_info,
            forms:form_id (
              id,
              title,
              slug,
              description
            ),
            form_submission_answers (
              id,
              answer_text,
              form_fields:form_field_id (
                id,
                label,
                field_key,
                field_type,
                display_order
              )
            )
          `,
          )
          .eq('id', approval.entity_id)
          .maybeSingle();

        entityDetails = submission ?? null;
      } else if (approval.entity_type === 'service_excuse') {
        const { data: excuse } = await supabase
          .from('service_excuse_requests')
          .select(
            `
            id,
            user_id,
            member_id,
            request_date,
            start_date,
            end_date,
            services,
            reason,
            status,
            is_long_leave,
            created_at,
            users:user_id (
              id,
              member_id,
              full_name,
              nickname,
              email,
              phone
            )
          `,
          )
          .eq('id', approval.entity_id)
          .maybeSingle();

        entityDetails = excuse ?? null;
      }

      return new Response(
        JSON.stringify({
          success: true,
          approval: {
            id: approval.id,
            entity_type: approval.entity_type,
            entity_id: approval.entity_id,
            status: approval.status,
            title: approval.title,
            summary: approval.summary,
            requester_name: approval.requester_name,
            requester_email: approval.requester_email,
            assigned_to_email: approval.assigned_to_email,
            decided_at: approval.decided_at,
            decided_by_email: approval.decided_by_email,
            decision_notes: approval.decision_notes,
            token_expires_at: approval.token_expires_at,
            is_expired: isExpired,
            created_at: approval.created_at,
            metadata: approval.metadata,
          },
          entity_details: entityDetails,
        }),
        {
          status: 200,
          headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // 3. Handle Action: submit_decision
    if (action === 'submit_decision') {
      if (approval.status !== 'pending') {
        return new Response(
          JSON.stringify({
            success: false,
            error: `This request has already been ${approval.status}`,
            already_decided: true,
            status: approval.status,
            decided_at: approval.decided_at,
            decided_by_email: approval.decided_by_email,
          }),
          {
            status: 409,
            headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      if (token && isExpired) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'This approval token has expired',
            expired: true,
          }),
          {
            status: 410,
            headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Execute apply_approval_decision RPC
      const deciderEmail = reviewer_email || approval.assigned_to_email || 'Approver';
      const { data: rpcResult, error: rpcError } = await supabase.rpc('apply_approval_decision', {
        p_approval_id: approval.id,
        p_decision: decision as string,
        p_decision_notes: notes ?? null,
        p_decided_by_user_id: guard.userId ?? null,
        p_decided_by_email: deciderEmail,
      });

      if (rpcError) {
        console.error('apply_approval_decision RPC error:', rpcError);
        return new Response(
          JSON.stringify({
            success: false,
            error: rpcError.message || 'Failed to apply approval decision',
            error_code: 'RPC_ERROR',
          }),
          {
            status: 500,
            headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Dispatch outcome notification email to requester if requester_email is known
      if (approval.requester_email) {
        const isApproved = decision === 'approved';
        const subject = `Your request for "${approval.title}" has been ${isApproved ? 'Approved' : 'Declined'}`;
        const noteHtml = notes
          ? `<div style="margin-top: 16px; padding: 12px; background-color: #f3f4f6; border-radius: 8px; border-left: 4px solid ${isApproved ? '#10b981' : '#f43f5e'};">
              <strong style="color: #374151;">Reviewer Note:</strong>
              <p style="margin: 4px 0 0; color: #4b5563;">${escapeHtml(notes)}</p>
            </div>`
          : '';

        try {
          await sendResendEmail({
            to: approval.requester_email,
            subject,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
                <h2 style="color: ${isApproved ? '#059669' : '#e11d48'}; margin-top: 0;">
                  Request ${isApproved ? 'Approved' : 'Declined'}
                </h2>
                <p style="font-size: 15px; color: #1f2937;">Hello ${escapeHtml(approval.requester_name)},</p>
                <p style="font-size: 15px; color: #1f2937;">
                  Your request for <strong>${escapeHtml(approval.title)}</strong> has been
                  <strong style="color: ${isApproved ? '#059669' : '#e11d48'};">${isApproved ? 'approved' : 'declined'}</strong>.
                </p>
                ${noteHtml}
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="font-size: 13px; color: #9ca3af; margin: 0;">
                  This is an automated notification from the Welcome Hub approval system.
                </p>
              </div>
            `,
            text: `Hello ${approval.requester_name},\n\nYour request for "${approval.title}" has been ${isApproved ? 'approved' : 'declined'}.\n${notes ? `\nReviewer Note: ${notes}\n` : ''}\n---\nWelcome Hub`,
            targetType: 'approval-outcome',
          });
        } catch (emailErr) {
          console.error('Failed to send approval outcome email:', emailErr);
          // Non-blocking: decision was recorded successfully
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Request successfully ${decision}`,
          status: decision,
          result: rpcResult,
        }),
        {
          status: 200,
          headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unsupported action',
      }),
      {
        status: 400,
        headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Unexpected error in handleProcessApprovalDecision:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error processing approval decision',
      }),
      {
        status: 500,
        headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
}
