import { enqueueApprovalOutcomeEmail, enqueueApprovalReviewEmail } from '../_shared/approvals.ts';
import { RATE_LIMIT_PRESETS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { z } from '../_shared/validation.ts';

export const processApprovalDecisionSchema = z
  .object({
    action: z.enum(['get_review_data', 'submit_decision', 'delegate_approval']),
    token: z.string().trim().optional(),
    approval_id: z.string().uuid().optional(),
    decision: z.enum(['approved', 'rejected']).optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
    reviewer_email: z.string().trim().email().optional().nullable(),
    assigned_to_email: z.string().trim().email().optional().nullable(),
    assigned_to_user_id: z.string().uuid().optional().nullable(),
  })
  .refine((data) => Boolean(data.token || data.approval_id), {
    message: 'Either token or approval_id must be provided',
    path: ['token'],
  })
  .refine((data) => data.action !== 'submit_decision' || Boolean(data.decision), {
    message: 'Decision (approved or rejected) is required when submitting a decision',
    path: ['decision'],
  })
  .refine((data) => data.action !== 'delegate_approval' || Boolean(data.assigned_to_email), {
    message: 'assigned_to_email is required when delegating approval',
    path: ['assigned_to_email'],
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

  const {
    action,
    token,
    approval_id,
    decision,
    notes,
    reviewer_email,
    assigned_to_email,
    assigned_to_user_id,
  } = guard.data;
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

      // Dispatch outcome notification email to requester if requester_email is known.
      // For form submissions, only dispatch outcome email once the final decision is reached
      // (all approved, or at least one rejected). For other entity types, dispatch immediately.
      const rpcData = (rpcResult as Record<string, unknown>) ?? {};
      const finalDecision = (rpcData.final_decision as 'approved' | 'rejected' | null) ?? null;
      const shouldDispatchOutcomeEmail =
        Boolean(approval.requester_email) &&
        (approval.entity_type !== 'form_submission' || Boolean(finalDecision));

      if (shouldDispatchOutcomeEmail && approval.requester_email) {
        try {
          const outcomeDecision = (finalDecision || decision) as 'approved' | 'rejected';
          await enqueueApprovalOutcomeEmail(supabase, {
            recipientEmail: approval.requester_email,
            requesterName: approval.requester_name,
            title: approval.title,
            decision: outcomeDecision,
            notes,
            approvalId: approval.id,
          });
        } catch (emailErr) {
          console.error('Failed to enqueue approval outcome email:', emailErr);
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

    // 4. Handle Action: delegate_approval
    if (action === 'delegate_approval') {
      if (!approval_id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'approval_id is required to delegate approval',
          }),
          {
            status: 400,
            headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const { data: rawDelegateResult, error: delegateError } = await supabase.rpc(
        'delegate_approval_request',
        {
          p_approval_id: approval_id,
          p_assigned_to_email: assigned_to_email!,
          p_assigned_to_user_id: assigned_to_user_id ?? null,
        },
      );

      if (delegateError) {
        console.error('delegate_approval_request RPC error:', delegateError);
        return new Response(
          JSON.stringify({
            success: false,
            error: delegateError?.message || 'Failed to delegate approval request',
            error_code: 'RPC_ERROR',
          }),
          {
            status: 500,
            headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      type DelegateRpcData = {
        success?: boolean;
        approval_id?: string;
        assigned_to_email?: string;
        assigned_to_user_id?: string | null;
        title?: string;
        access_token?: string;
        requester_name?: string;
        requester_email?: string | null;
        summary?: string | null;
        entity_type?: string;
        error?: string;
      };

      const delegateResult = (rawDelegateResult as unknown as DelegateRpcData) ?? null;

      if (!delegateResult || delegateResult.success === false) {
        return new Response(
          JSON.stringify({
            success: false,
            error: delegateResult?.error || 'Failed to delegate request',
          }),
          {
            status: 400,
            headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Enqueue review email to newly assigned reviewer
      if (delegateResult.assigned_to_email && delegateResult.access_token) {
        try {
          const detailList: Array<{ label: string; value: string }> = [
            { label: 'Requester', value: delegateResult.requester_name || 'Requester' },
          ];
          if (delegateResult.summary) {
            detailList.push({ label: 'Summary', value: delegateResult.summary });
          }

          await enqueueApprovalReviewEmail(supabase, {
            assignedToEmail: delegateResult.assigned_to_email,
            subjectTitle: `${delegateResult.title || 'Approval Request'} - ${delegateResult.requester_name || 'Requester'}`,
            heading: 'Approval Review Required',
            description: 'An approval request has been delegated to you for sign-off:',
            details: detailList,
            accessToken: delegateResult.access_token,
            approvalId: delegateResult.approval_id,
          });
        } catch (emailErr) {
          console.error('Failed to enqueue review email during delegation:', emailErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Approval delegated to ${delegateResult.assigned_to_email}`,
          approval_id: delegateResult.approval_id,
          assigned_to_email: delegateResult.assigned_to_email,
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
