import type { Database, Json } from '@/shared/database.types.ts';
import { enqueueEmailNotification, triggerEmailProcessor } from '@/shared/emailQueue.ts';

import type {
  RecruitmentApplication,
  RecruitmentTransactionInsert,
  RecruitmentTransactionUpdate,
  SupabaseClient,
} from '../types.ts';

export const reviewerRoles = new Set(['admin', 'super_admin', 'slod', 'vmt']);
export const overrideRoles = new Set(['admin', 'super_admin']);

export function response(
  status: number,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function asJson(value: Record<string, unknown> | undefined): Json {
  return JSON.parse(JSON.stringify(value ?? {})) as Json;
}

export function getStepKeyForNumber(
  step: number,
): Database['public']['Tables']['recruitment_pipeline_transactions']['Insert']['step_key'] {
  switch (step) {
    case 1:
      return 'register';
    case 2:
      return 'interview';
    case 3:
      return 'orientation';
    case 4:
      return 'observation';
    case 5:
      return 'evaluation';
    case 6:
      return 'final_interview';
    case 7:
      return 'vmt_endorsement';
    case 8:
      return 'rfid_assignment';
    default:
      return 'deployment';
  }
}

export function createApprovalAccessToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function findLatestTransaction(
  supabase: SupabaseClient,
  applicationId: string,
  stepNumber: number,
) {
  const { data, error } = await supabase
    .from('recruitment_pipeline_transactions')
    .select(
      'id, attempt_number, status, scheduled_at, assigned_reviewer_id, assigned_reviewer_name, notes, applicant_visible_notes, rubric_data',
    )
    .eq('application_id', applicationId)
    .eq('step_number', stepNumber)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
}

export async function saveTransaction(
  supabase: SupabaseClient,
  application: RecruitmentApplication,
  stepNumber: number,
  stepKey: string,
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'declined',
  transactionType:
    | 'scheduled'
    | 'rescheduled'
    | 'completed'
    | 'repeated_step'
    | 'returned_to_observation'
    | 'returned_to_interview'
    | 'skipped'
    | 'on_hold'
    | 'archived'
    | 'restored'
    | 'declined',
  userId: string,
  fields: {
    scheduledAt?: string | null;
    assignedReviewerId?: string | null;
    assignedReviewerName?: string | null;
    rubricData?: Record<string, unknown>;
    notes?: string | null;
    fromStep?: number | null;
    toStep?: number | null;
  } = {},
): Promise<{ id: string | null; error: { message: string } | null }> {
  const latest = await findLatestTransaction(supabase, application.id, stepNumber);
  if (latest.error) {
    return { id: null, error: latest.error };
  }

  const isOpenAttempt =
    latest.data && !['completed', 'skipped', 'declined'].includes(latest.data.status);
  const attemptNumber = latest.data ? latest.data.attempt_number + (isOpenAttempt ? 0 : 1) : 1;
  const scheduledAt = fields.scheduledAt ?? null;

  let resolvedReviewerId: string | null = null;
  if (fields.assignedReviewerId !== undefined) {
    resolvedReviewerId = fields.assignedReviewerId;
  } else if (status === 'completed') {
    resolvedReviewerId = latest.data?.assigned_reviewer_id ?? userId;
  }

  let resolvedReviewerName: string | null = null;
  if (fields.assignedReviewerName !== undefined) {
    resolvedReviewerName = fields.assignedReviewerName;
  } else if (status === 'completed') {
    resolvedReviewerName = latest.data?.assigned_reviewer_name ?? null;
  }

  const update: RecruitmentTransactionUpdate = {
    attempt_number: attemptNumber,
    transaction_type: transactionType,
    from_step: fields.fromStep ?? application.current_step,
    to_step: fields.toStep ?? application.current_step,
    status,
    assigned_reviewer_id: resolvedReviewerId,
    assigned_reviewer_name: resolvedReviewerName,
    scheduled_at: scheduledAt,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
    rubric_data: asJson(fields.rubricData),
    notes: fields.notes ?? null,
    applicant_visible_notes: null,
  };

  if (latest.data && isOpenAttempt) {
    const { data, error } = await supabase
      .from('recruitment_pipeline_transactions')
      .update(update)
      .eq('id', latest.data.id)
      .select('id')
      .single();

    if (!error && data?.id && fields.notes?.trim()) {
      await supabase.from('recruitment_step_notes').insert({
        application_id: application.id,
        step_number: stepNumber,
        attempt_number: attemptNumber,
        transaction_id: data.id,
        author_id: fields.assignedReviewerId ?? userId,
        author_name: fields.assignedReviewerName?.trim() || 'Recruitment Reviewer',
        content: fields.notes.trim(),
      });
    }

    return { id: data?.id ?? null, error };
  }

  const insert: RecruitmentTransactionInsert = {
    application_id: application.id,
    step_number: stepNumber,
    step_key:
      stepKey as Database['public']['Tables']['recruitment_pipeline_transactions']['Insert']['step_key'],
    attempt_number: attemptNumber,
    transaction_type: transactionType,
    from_step: fields.fromStep ?? application.current_step,
    to_step: fields.toStep ?? application.current_step,
    status,
    assigned_reviewer_id: resolvedReviewerId,
    assigned_reviewer_name: resolvedReviewerName,
    scheduled_at: scheduledAt,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
    rubric_data: asJson(fields.rubricData),
    notes: fields.notes ?? null,
    applicant_visible_notes: null,
    created_by_user_id: userId,
  };
  const { data, error } = await supabase
    .from('recruitment_pipeline_transactions')
    .insert(insert)
    .select('id')
    .single();

  if (!error && data?.id && fields.notes?.trim()) {
    await supabase.from('recruitment_step_notes').insert({
      application_id: application.id,
      step_number: stepNumber,
      attempt_number: attemptNumber,
      transaction_id: data.id,
      author_id: fields.assignedReviewerId ?? userId,
      author_name: fields.assignedReviewerName?.trim() || 'Recruitment Reviewer',
      content: fields.notes.trim(),
    });
  }

  return { id: data?.id ?? null, error };
}

export async function notifyApplicant(
  supabase: SupabaseClient,
  application: RecruitmentApplication,
  reviewerId: string,
  title: string,
  message: string,
): Promise<void> {
  if (application.auth_user_id) {
    const { data: notification, error: notificationError } = await supabase
      .from('app_notifications')
      .insert({
        title,
        message,
        target_type: 'user',
        created_by: reviewerId,
      })
      .select('id')
      .single();

    if (!notificationError && notification) {
      await supabase.from('app_notification_recipients').insert({
        notification_id: notification.id,
        user_id: application.auth_user_id,
      });
    }
  }

  const { error } = await enqueueEmailNotification(supabase, {
    recipient: application.email,
    category: 'approval',
    event_type: 'email_notification',
    template_slug: 'recruitment-stage-update',
    subject: title,
    text: message,
    metadata: { application_id: application.id, target_type: 'recruitment-application' },
  });
  if (error) {
    console.error('Failed to queue recruitment stage notification:', error);
  } else {
    await triggerEmailProcessor(supabase);
  }
}

export function nextStepForCompletion(
  stepNumber: number,
  confirmedRole: string | null,
  currentStep: number,
  orientationAlreadyCompleted: boolean,
): number {
  if (stepNumber === 2) return orientationAlreadyCompleted ? 4 : 3;
  if (stepNumber === 3) return currentStep === 2 ? 2 : 4;
  if (stepNumber === 4) return 5;
  if (stepNumber === 5) return confirmedRole === 'Prayer Coach' ? 6 : 7;
  if (stepNumber === 6 || stepNumber === 7 || stepNumber === 8) return stepNumber + 1;
  return 9;
}
