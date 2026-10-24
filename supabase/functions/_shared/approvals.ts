import type { SupabaseClient } from '@supabase/supabase-js';

import { enqueueEmailNotification, triggerEmailProcessor } from './emailQueue.ts';
import { buildApprovalOutcomeEmail, buildApprovalReviewEmail } from './emailTemplates/index.ts';

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

export interface EnqueueApprovalReviewParams {
  assignedToEmail: string;
  subjectTitle: string;
  heading?: string;
  description?: string;
  details: Array<{ label: string; value: string }>;
  accessToken: string;
  approvalId?: string;
}

/**
 * Enqueues an approval review request email into the pgmq queue and triggers the processor.
 */
export async function enqueueApprovalReviewEmail(
  supabase: SupabaseClient,
  params: EnqueueApprovalReviewParams,
): Promise<{ success: boolean; messageId: number | null }> {
  const { assignedToEmail, subjectTitle, heading, description, details, accessToken, approvalId } =
    params;

  const reviewUrl = buildApprovalReviewUrl(accessToken);
  const template = buildApprovalReviewEmail({
    subjectTitle,
    heading,
    description,
    details,
    reviewUrl,
  });

  const detailsMap: Record<string, string> = {};
  for (const item of details) {
    const key = item.label.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    detailsMap[key] = item.value;
  }

  const detailsHtml = details
    .map(
      (item) =>
        `<div style="margin: 0 0 6px 0;"><span style="color: #71717a; font-weight: 600;">${item.label}:</span><strong style="color: #0f172a; margin-left: 6px;">${item.value}</strong></div>`,
    )
    .join('');

  const { messageId, error } = await enqueueEmailNotification(supabase, {
    recipient: assignedToEmail,
    category: 'approval',
    event_type: 'email_notification',
    template_slug: 'approval-review-request',
    subject: template.subject,
    html: template.html,
    text: template.text,
    metadata: {
      target_type: 'approval-request',
      approval_id: approvalId,
      access_token: accessToken,
      subject_title: subjectTitle,
      heading: heading || 'Approval Required',
      description: description || 'A request requires your review and approval:',
      review_url: reviewUrl,
      action_url: reviewUrl,
      action_text: 'Review & Take Action',
      details_html: detailsHtml,
      ...detailsMap,
    },
  });

  if (error) {
    console.error('[approvals] Failed to enqueue approval review email:', error);
    return { success: false, messageId: null };
  }

  // Trigger background processor to drain queue immediately
  try {
    await triggerEmailProcessor(supabase);
  } catch (triggerErr) {
    console.warn('[approvals] Background email processor trigger warning:', triggerErr);
  }

  return { success: true, messageId };
}

export interface EnqueueApprovalOutcomeParams {
  recipientEmail: string;
  requesterName: string;
  title: string;
  decision: 'approved' | 'rejected';
  notes?: string | null;
  approvalId?: string;
}

/**
 * Enqueues an approval outcome decision email (approved or rejected) to the requester.
 */
export async function enqueueApprovalOutcomeEmail(
  supabase: SupabaseClient,
  params: EnqueueApprovalOutcomeParams,
): Promise<{ success: boolean; messageId: number | null }> {
  const { recipientEmail, requesterName, title, decision, notes, approvalId } = params;

  const template = buildApprovalOutcomeEmail({
    title,
    requesterName,
    decision,
    notes,
  });

  const isApproved = decision === 'approved';
  const statusLabel = isApproved ? 'Approved' : 'Declined';

  const { messageId, error } = await enqueueEmailNotification(supabase, {
    recipient: recipientEmail,
    category: 'approval',
    event_type: 'email_notification',
    template_slug: 'approval-outcome-notification',
    subject: template.subject,
    html: template.html,
    text: template.text,
    metadata: {
      target_type: 'approval-outcome',
      approval_id: approvalId,
      decision,
      decision_label: statusLabel,
      title,
      requester_name: requesterName,
      notes: notes || '',
    },
  });

  if (error) {
    console.error('[approvals] Failed to enqueue approval outcome email:', error);
    return { success: false, messageId: null };
  }

  try {
    await triggerEmailProcessor(supabase);
  } catch (triggerErr) {
    console.warn('[approvals] Background email processor trigger warning:', triggerErr);
  }

  return { success: true, messageId };
}
