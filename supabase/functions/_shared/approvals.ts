import type { SupabaseClient } from '@supabase/supabase-js';

import { escapeHtml } from './emailTemplate.ts';
import { sendResendEmail } from './resend.ts';

export type ApprovalEntityType = 'service_excuse' | 'form_submission';

export interface CreateApprovalRequestParams {
  entityType: ApprovalEntityType;
  entityId: string;
  title: string;
  summary: string;
  requesterUserId?: string | null;
  requesterName: string;
  requesterEmail?: string | null;
  assignedToEmail?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateApprovalRequestResult {
  success: boolean;
  approval?: {
    id: string;
    access_token: string;
  };
  error?: string;
}

/**
 * Creates an entry in public.approval_requests with a secure access token.
 */
export async function createApprovalRequest(
  supabase: SupabaseClient,
  params: CreateApprovalRequestParams,
): Promise<CreateApprovalRequestResult> {
  const {
    entityType,
    entityId,
    title,
    summary,
    requesterUserId,
    requesterName,
    requesterEmail,
    assignedToEmail,
    metadata = {},
  } = params;

  const { data, error } = await supabase
    .from('approval_requests')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      status: 'pending',
      title,
      summary,
      requester_user_id: requesterUserId || null,
      requester_name: requesterName,
      requester_email: requesterEmail || null,
      assigned_to_email: assignedToEmail || null,
      metadata,
    })
    .select('id, access_token')
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? 'Failed to create approval request',
    };
  }

  return {
    success: true,
    approval: {
      id: data.id,
      access_token: data.access_token,
    },
  };
}

export interface SendApprovalNotificationParams {
  assignedToEmail: string;
  subjectTitle: string;
  heading: string;
  description: string;
  details: Array<{ label: string; value: string }>;
  accessToken: string;
}

/**
 * Builds the external review URL using the configured public app URL and access token.
 */
export function buildApprovalReviewUrl(accessToken: string): string {
  const appUrl = (
    Deno.env.get('APP_URL') ||
    Deno.env.get('PUBLIC_APP_URL') ||
    'https://welcomehub.app'
  ).replace(/\/+$/, '');
  return `${appUrl}/approvals/review/${accessToken}`;
}

/**
 * Sends a standardized notification email to the assigned approver with action links.
 */
export async function sendApprovalReviewEmail(
  params: SendApprovalNotificationParams,
): Promise<void> {
  const { assignedToEmail, subjectTitle, heading, description, details, accessToken } = params;
  const reviewUrl = buildApprovalReviewUrl(accessToken);

  const detailsHtml = details
    .map(
      (d) =>
        `<p style="margin: 0 0 8px 0;"><strong>${escapeHtml(d.label)}:</strong> ${escapeHtml(d.value)}</p>`,
    )
    .join('\n');

  const detailsText = details.map((d) => `${d.label}: ${d.value}`).join('\n');

  await sendResendEmail({
    to: assignedToEmail,
    subject: `[Approval Required] ${subjectTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1f2937; margin-top: 0;">${escapeHtml(heading)}</h2>
        <p style="font-size: 15px; color: #374151;">${escapeHtml(description)}</p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          ${detailsHtml}
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
    text: `${heading}\n\n${detailsText}\n\nReview link: ${reviewUrl}`,
    targetType: 'approval-request',
  });
}
