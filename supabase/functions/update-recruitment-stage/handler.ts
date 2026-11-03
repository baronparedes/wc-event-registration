import { enqueueApprovalReviewEmail } from '../_shared/approvals.ts';
import { RATE_LIMIT_PRESETS } from '../_shared/constants.ts';
import type { Database, Json } from '../_shared/database.types.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { enqueueEmailNotification, triggerEmailProcessor } from '../_shared/emailQueue.ts';
import { z } from '../_shared/validation.ts';

const serviceSlots = ['9AM', '12NN', '3PM'] as const;

const commitmentsSchema = z
  .object({
    first_sunday: z.array(z.enum(serviceSlots)).optional(),
    second_sunday: z.array(z.enum(serviceSlots)).optional(),
    third_sunday: z.array(z.enum(serviceSlots)).optional(),
    fourth_sunday: z.array(z.enum(serviceSlots)).optional(),
    fifth_sunday: z.array(z.enum(serviceSlots)).optional(),
  })
  .refine(
    (commitments) => Object.values(commitments).some((slots) => (slots?.length ?? 0) > 0),
    'Select at least one Sunday service slot',
  );

const updateRecruitmentStageSchema = z
  .object({
    action: z.enum([
      'complete_vmt',
      'save_commitments',
      'resend_endorsement',
      'update_stage',
      'repeat_step',
      'return_to_observation',
    ]),
    application_id: z.string().uuid(),
    step_number: z.number().int().min(2).max(8).optional(),
    status: z
      .enum(['pending', 'scheduled', 'in_progress', 'completed', 'skipped', 'declined', 'on_hold'])
      .optional(),
    scheduled_at: z.string().datetime({ offset: true }).optional().nullable(),
    assigned_reviewer_id: z.string().uuid().optional().nullable(),
    assigned_reviewer_name: z.string().trim().max(150).optional().nullable(),
    rubric_data: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().trim().max(5000).optional().nullable(),
    applicant_visible_notes: z.string().trim().max(2000).optional().nullable(),
    confirmed_role: z
      .enum(['Prayer Coach', 'Usher', 'Backroom Support', 'IMT Support', 'VMT Support'])
      .optional(),
    ccf_vmt_id: z.string().trim().max(100).optional().nullable(),
    ccf_vmt_date: z.string().date().optional().nullable(),
    assigned_rfid_member_id: z.string().trim().max(100).optional().nullable(),
    service_commitments: commitmentsSchema.optional(),
    override_endorsement_gate: z.boolean().optional().default(false),
  })
  .superRefine((request, context) => {
    if (request.action === 'update_stage' && (!request.step_number || !request.status)) {
      context.addIssue({
        code: 'custom',
        message: 'step_number and status are required for update_stage',
        path: ['step_number'],
      });
    }
    if (
      request.action === 'repeat_step' &&
      request.step_number !== 4 &&
      request.step_number !== 5
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Only observation and evaluation can be repeated',
        path: ['step_number'],
      });
    }
    if (request.action === 'return_to_observation' && request.step_number !== 5) {
      context.addIssue({
        code: 'custom',
        message: 'return_to_observation must reference evaluation step 5',
        path: ['step_number'],
      });
    }
  });

type RecruitmentApplication = Database['public']['Tables']['recruitment_applications']['Row'];
type RecruitmentTransactionInsert =
  Database['public']['Tables']['recruitment_pipeline_transactions']['Insert'];
type RecruitmentTransactionUpdate =
  Database['public']['Tables']['recruitment_pipeline_transactions']['Update'];
type RecruitmentApplicationUpdate =
  Database['public']['Tables']['recruitment_applications']['Update'];

const dgroupInfoSchema = z.object({ leader_email: z.string().email() });
const completeVmtResultSchema = z.object({
  success: z.literal(true),
  application_id: z.string().uuid(),
  current_step: z.number().int(),
  vmt_registered: z.literal(true),
  already_completed: z.boolean(),
});

const reviewerRoles = new Set(['admin', 'super_admin', 'slod', 'vmt']);
const overrideRoles = new Set(['admin', 'super_admin']);

function response(
  status: number,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function asJson(value: Record<string, unknown> | undefined): Json {
  return JSON.parse(JSON.stringify(value ?? {})) as Json;
}

function createApprovalAccessToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function findLatestTransaction(
  supabase: ReturnType<typeof useEdgeHook> extends Promise<infer Guard>
    ? Guard extends { client: infer Client }
      ? Client
      : never
    : never,
  applicationId: string,
  stepNumber: number,
) {
  const { data, error } = await supabase
    .from('recruitment_pipeline_transactions')
    .select('id, attempt_number, status')
    .eq('application_id', applicationId)
    .eq('step_number', stepNumber)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
}

async function saveTransaction(
  supabase: ReturnType<typeof useEdgeHook> extends Promise<infer Guard>
    ? Guard extends { client: infer Client }
      ? Client
      : never
    : never,
  application: RecruitmentApplication,
  stepNumber: number,
  stepKey: string,
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'declined',
  transactionType: 'scheduled' | 'rescheduled' | 'completed' | 'skipped' | 'on_hold' | 'declined',
  userId: string,
  fields: {
    scheduledAt?: string | null;
    assignedReviewerId?: string | null;
    assignedReviewerName?: string | null;
    rubricData?: Record<string, unknown>;
    notes?: string | null;
    applicantVisibleNotes?: string | null;
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
  const update: RecruitmentTransactionUpdate = {
    attempt_number: attemptNumber,
    transaction_type: transactionType,
    from_step: fields.fromStep ?? application.current_step,
    to_step: fields.toStep ?? application.current_step,
    status,
    assigned_reviewer_id: fields.assignedReviewerId ?? userId,
    assigned_reviewer_name: fields.assignedReviewerName ?? null,
    scheduled_at: scheduledAt,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
    rubric_data: asJson(fields.rubricData),
    notes: fields.notes ?? null,
    applicant_visible_notes: fields.applicantVisibleNotes ?? null,
  };

  if (latest.data && isOpenAttempt) {
    const { data, error } = await supabase
      .from('recruitment_pipeline_transactions')
      .update(update)
      .eq('id', latest.data.id)
      .select('id')
      .single();
    return { id: data?.id ?? null, error };
  }

  const insert: RecruitmentTransactionInsert = {
    application_id: application.id,
    step_number: stepNumber,
    step_key: stepKey,
    attempt_number: attemptNumber,
    transaction_type: transactionType,
    from_step: fields.fromStep ?? application.current_step,
    to_step: fields.toStep ?? application.current_step,
    status,
    assigned_reviewer_id: fields.assignedReviewerId ?? userId,
    assigned_reviewer_name: fields.assignedReviewerName ?? null,
    scheduled_at: scheduledAt,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
    rubric_data: asJson(fields.rubricData),
    notes: fields.notes ?? null,
    applicant_visible_notes: fields.applicantVisibleNotes ?? null,
    created_by_user_id: userId,
  };
  const { data, error } = await supabase
    .from('recruitment_pipeline_transactions')
    .insert(insert)
    .select('id')
    .single();
  return { id: data?.id ?? null, error };
}

async function notifyApplicant(
  supabase: ReturnType<typeof useEdgeHook> extends Promise<infer Guard>
    ? Guard extends { client: infer Client }
      ? Client
      : never
    : never,
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

function nextStepForCompletion(
  stepNumber: number,
  confirmedRole: string | null,
  currentStep: number,
  orientationAlreadyCompleted: boolean,
): number {
  if (stepNumber === 2) return orientationAlreadyCompleted ? 4 : 3;
  if (stepNumber === 3) return currentStep === 2 ? 2 : 4;
  if (stepNumber === 4) return 5;
  if (stepNumber === 5) return confirmedRole === 'Prayer Coach' ? 6 : 7;
  if (stepNumber === 6 || stepNumber === 7) return stepNumber + 1;
  return 8;
}

export async function handleUpdateRecruitmentStage(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'update-recruitment-stage',
    method: 'POST',
    requireAuth: true,
    schema: updateRecruitmentStageSchema,
    publicRateLimit: {
      scope: 'update-recruitment-stage',
      windowMs: RATE_LIMIT_PRESETS.submitRegistration.windowMs,
      maxHits: RATE_LIMIT_PRESETS.submitRegistration.maxHits,
    },
  });

  if (!guard.valid) return guard.response;

  const { action, application_id: applicationId } = guard.data;
  const supabase = guard.client;
  const userId = guard.userId;
  if (!userId) {
    return response(401, { success: false, error: 'Unauthorized' }, guard.corsHeaders);
  }
  const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(userId);
  if (authUserError || !authUser.user?.email) {
    return response(
      401,
      { success: false, error: 'Unable to verify applicant identity' },
      guard.corsHeaders,
    );
  }
  const normalizedEmail = authUser.user.email.toLowerCase();

  const { data: adminRecord } = await supabase
    .from('admins')
    .select('role')
    .eq('auth_user_id', userId)
    .maybeSingle();
  const adminRole = adminRecord?.role ?? null;
  const isReviewer = adminRole !== null && reviewerRoles.has(adminRole);
  const isApplicantSelfService = action === 'complete_vmt' || action === 'save_commitments';

  const { data: application, error: applicationError } = await supabase
    .from('recruitment_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    return response(
      404,
      { success: false, error: 'Recruitment application not found' },
      guard.corsHeaders,
    );
  }

  if (
    (!isReviewer || isApplicantSelfService) &&
    application.auth_user_id !== userId &&
    application.email.toLowerCase() !== normalizedEmail
  ) {
    return response(
      404,
      { success: false, error: 'Recruitment application not found' },
      guard.corsHeaders,
    );
  }

  if (!isReviewer && application.auth_user_id === null && action !== 'complete_vmt') {
    const { error } = await supabase
      .from('recruitment_applications')
      .update({ auth_user_id: userId })
      .eq('id', application.id);
    if (error) {
      return response(
        500,
        { success: false, error: 'Failed to link applicant account' },
        guard.corsHeaders,
      );
    }
    application.auth_user_id = userId;
  }

  if (action === 'complete_vmt') {
    if (application.current_step !== 7) {
      return response(
        409,
        { success: false, error: 'CCF VMT registration is not the current step' },
        guard.corsHeaders,
      );
    }
    const { data: completionData, error: completionError } = await supabase.rpc(
      'complete_recruitment_vmt_registration',
      {
        p_application_id: application.id,
        p_actor_user_id: userId,
        p_actor_email: normalizedEmail,
      },
    );
    const completion = completeVmtResultSchema.safeParse(completionData);
    if (completionError || !completion.success) {
      console.error('Failed to atomically complete CCF VMT registration:', completionError);
      return response(
        completionError ? 409 : 500,
        { success: false, error: 'Failed to record CCF VMT registration' },
        guard.corsHeaders,
      );
    }
    return response(
      200,
      {
        success: true,
        current_step: completion.data.current_step,
        vmt_registered: completion.data.vmt_registered,
        already_completed: completion.data.already_completed,
      },
      guard.corsHeaders,
    );
  }

  if (action === 'save_commitments') {
    if (!guard.data.service_commitments) {
      return response(
        400,
        { success: false, error: 'Sunday commitments are required' },
        guard.corsHeaders,
      );
    }
    if (application.current_step !== 8) {
      return response(
        409,
        { success: false, error: 'Sunday commitments are not the current step' },
        guard.corsHeaders,
      );
    }
    const { error } = await supabase
      .from('recruitment_applications')
      .update({ service_commitments: guard.data.service_commitments })
      .eq('id', application.id);
    if (error) {
      return response(
        500,
        { success: false, error: 'Failed to save Sunday commitments' },
        guard.corsHeaders,
      );
    }
    return response(200, { success: true }, guard.corsHeaders);
  }

  if (action === 'resend_endorsement') {
    if (!isReviewer && application.auth_user_id !== userId) {
      return response(
        404,
        { success: false, error: 'Recruitment application not found' },
        guard.corsHeaders,
      );
    }
    if (!application.dgroup_approval_id) {
      return response(
        404,
        { success: false, error: 'Endorsement request not found' },
        guard.corsHeaders,
      );
    }
    const { data: approval, error } = await supabase
      .from('approval_requests')
      .select('id, access_token, status')
      .eq('id', application.dgroup_approval_id)
      .maybeSingle();
    if (error || !approval || approval.status !== 'pending') {
      return response(
        409,
        { success: false, error: 'Endorsement is not pending' },
        guard.corsHeaders,
      );
    }
    const { data: refreshedApproval, error: refreshError } = await supabase
      .from('approval_requests')
      .update({
        access_token: createApprovalAccessToken(),
        token_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        token_used_at: null,
      })
      .eq('id', approval.id)
      .eq('status', 'pending')
      .select('id, access_token')
      .maybeSingle();
    if (refreshError || !refreshedApproval) {
      return response(
        500,
        { success: false, error: 'Failed to refresh endorsement link' },
        guard.corsHeaders,
      );
    }
    const emailResult = await enqueueApprovalReviewEmail(supabase, {
      assignedToEmail: dgroupInfoSchema.parse(application.dgroup_info).leader_email,
      subjectTitle: `Welcome Center Volunteer Endorsement - ${application.full_name}`,
      heading: 'DGroup Leader Endorsement Required',
      description: 'A member of your DGroup has applied to serve in the Welcome Center ministry.',
      details: [
        { label: 'Applicant', value: application.full_name },
        { label: 'Desired Role', value: application.desired_role },
      ],
      accessToken: refreshedApproval.access_token,
      approvalId: refreshedApproval.id,
    });
    return emailResult.success
      ? response(200, { success: true }, guard.corsHeaders)
      : response(
          500,
          { success: false, error: 'Failed to resend endorsement email' },
          guard.corsHeaders,
        );
  }

  if (!isReviewer) {
    return response(403, { success: false, error: 'Reviewer access required' }, guard.corsHeaders);
  }

  if (action === 'repeat_step' || action === 'return_to_observation') {
    const stepNumber = guard.data.step_number;
    if (!stepNumber)
      return response(400, { success: false, error: 'step_number is required' }, guard.corsHeaders);
    if (application.current_step !== stepNumber) {
      return response(
        409,
        { success: false, error: 'Only the current step can be repeated' },
        guard.corsHeaders,
      );
    }
    if (guard.data.override_endorsement_gate && !overrideRoles.has(adminRole ?? '')) {
      return response(
        403,
        { success: false, error: 'Only admins can override the endorsement gate' },
        guard.corsHeaders,
      );
    }
    if (stepNumber >= 4 && !guard.data.override_endorsement_gate) {
      const { data: approval } = await supabase
        .from('approval_requests')
        .select('status')
        .eq('id', application.dgroup_approval_id ?? '')
        .maybeSingle();
      if (approval?.status !== 'approved') {
        return response(
          409,
          { success: false, error: 'DGroup leader endorsement is required before observation' },
          guard.corsHeaders,
        );
      }
    }

    const currentTransaction = await findLatestTransaction(supabase, application.id, stepNumber);
    if (currentTransaction.error || !currentTransaction.data) {
      return response(
        409,
        { success: false, error: 'There is no session to repeat' },
        guard.corsHeaders,
      );
    }
    const updateCurrent: RecruitmentTransactionUpdate = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      transaction_type:
        action === 'return_to_observation' ? 'returned_to_observation' : 'completed',
      notes: guard.data.notes ?? null,
      rubric_data: asJson(guard.data.rubric_data),
    };
    const { error: completeError } = await supabase
      .from('recruitment_pipeline_transactions')
      .update(updateCurrent)
      .eq('id', currentTransaction.data.id);
    if (completeError) {
      return response(
        500,
        { success: false, error: 'Failed to close current session' },
        guard.corsHeaders,
      );
    }

    const repeatStepNumber = action === 'return_to_observation' ? 4 : stepNumber;
    const repeatStepKey = repeatStepNumber === 4 ? 'observation' : 'evaluation';
    let nextAttempt = currentTransaction.data.attempt_number + 1;
    if (repeatStepNumber !== stepNumber) {
      const latestRepeat = await findLatestTransaction(supabase, application.id, repeatStepNumber);
      if (latestRepeat.error) {
        return response(
          500,
          { success: false, error: 'Failed to read observation history' },
          guard.corsHeaders,
        );
      }
      nextAttempt = latestRepeat.data ? latestRepeat.data.attempt_number + 1 : 1;
    }
    const { error: repeatError } = await supabase.from('recruitment_pipeline_transactions').insert({
      application_id: application.id,
      step_number: repeatStepNumber,
      step_key: repeatStepKey,
      attempt_number: nextAttempt,
      transaction_type:
        action === 'return_to_observation' ? 'returned_to_observation' : 'repeated_step',
      from_step: stepNumber,
      to_step: repeatStepNumber,
      status: 'scheduled',
      scheduled_at: guard.data.scheduled_at ?? null,
      assigned_reviewer_id: guard.data.assigned_reviewer_id ?? userId,
      assigned_reviewer_name: guard.data.assigned_reviewer_name ?? null,
      created_by_user_id: userId,
    });
    if (repeatError) {
      return response(
        500,
        { success: false, error: 'Failed to schedule the next session' },
        guard.corsHeaders,
      );
    }

    const nextStep = action === 'return_to_observation' ? 4 : stepNumber;
    const { error: applicationUpdateError } = await supabase
      .from('recruitment_applications')
      .update({ current_step: nextStep })
      .eq('id', application.id);
    if (applicationUpdateError) {
      return response(
        500,
        { success: false, error: 'Failed to update recruitment progress' },
        guard.corsHeaders,
      );
    }
    await notifyApplicant(
      supabase,
      application,
      userId,
      action === 'return_to_observation'
        ? 'Additional observation scheduled'
        : 'Another session scheduled',
      guard.data.applicant_visible_notes ?? 'A new recruitment session has been scheduled.',
    );
    return response(200, { success: true, current_step: nextStep }, guard.corsHeaders);
  }

  if (action !== 'update_stage' || !guard.data.step_number || !guard.data.status) {
    return response(
      400,
      { success: false, error: 'A valid stage update is required' },
      guard.corsHeaders,
    );
  }

  const stepNumber = guard.data.step_number;
  const stageStatus = guard.data.status;
  const overrideGate = guard.data.override_endorsement_gate;
  const allowedSteps = application.current_step === 2 ? [2, 3] : [application.current_step];
  if (!allowedSteps.includes(stepNumber)) {
    return response(
      409,
      { success: false, error: 'Stage update is out of sequence' },
      guard.corsHeaders,
    );
  }
  if (guard.data.confirmed_role && stepNumber > 5) {
    return response(
      400,
      { success: false, error: 'Confirmed role can only be changed through evaluation' },
      guard.corsHeaders,
    );
  }
  if (overrideGate && !overrideRoles.has(adminRole ?? '')) {
    return response(
      403,
      { success: false, error: 'Only admins can override the endorsement gate' },
      guard.corsHeaders,
    );
  }

  let orientationAlreadyCompleted = false;
  if (stageStatus === 'completed' && stepNumber === 2) {
    const orientation = await findLatestTransaction(supabase, application.id, 3);
    if (orientation.error) {
      return response(
        500,
        { success: false, error: 'Failed to read orientation progress' },
        guard.corsHeaders,
      );
    }
    orientationAlreadyCompleted = orientation.data?.status === 'completed';
  }
  const nextStep =
    stageStatus === 'completed'
      ? nextStepForCompletion(
          stepNumber,
          guard.data.confirmed_role ?? application.confirmed_role,
          application.current_step,
          orientationAlreadyCompleted,
        )
      : application.current_step;
  if (stepNumber >= 4 && !overrideGate) {
    const { data: approval } = await supabase
      .from('approval_requests')
      .select('status')
      .eq('id', application.dgroup_approval_id ?? '')
      .maybeSingle();
    if (approval?.status !== 'approved') {
      return response(
        409,
        { success: false, error: 'DGroup leader endorsement is required before observation' },
        guard.corsHeaders,
      );
    }
  }

  if (stageStatus === 'completed' && stepNumber === 5) {
    const role = guard.data.confirmed_role ?? application.confirmed_role;
    if (!role) {
      return response(
        400,
        { success: false, error: 'A confirmed role is required to complete evaluation' },
        guard.corsHeaders,
      );
    }
  }
  if (stageStatus === 'completed' && stepNumber === 7) {
    if (
      !(guard.data.ccf_vmt_id ?? application.ccf_vmt_id) ||
      !(guard.data.ccf_vmt_date ?? application.ccf_vmt_date)
    ) {
      return response(
        400,
        { success: false, error: 'CCF VMT ID and date are required to complete Step 7' },
        guard.corsHeaders,
      );
    }
  }

  const stepKeys: Record<number, string> = {
    2: 'interview',
    3: 'orientation',
    4: 'observation',
    5: 'evaluation',
    6: 'onboarding',
    7: 'vmt_registration',
    8: 'rfid_releasing',
  };
  const latest = await findLatestTransaction(supabase, application.id, stepNumber);
  if (latest.error) {
    return response(
      500,
      { success: false, error: 'Failed to read current recruitment session' },
      guard.corsHeaders,
    );
  }
  const wasScheduled = Boolean(latest.data?.status === 'scheduled');
  const transactionType =
    stageStatus === 'completed'
      ? 'completed'
      : stageStatus === 'declined'
        ? 'declined'
        : stageStatus === 'skipped'
          ? 'skipped'
          : stageStatus === 'on_hold'
            ? 'on_hold'
            : guard.data.scheduled_at
              ? wasScheduled
                ? 'rescheduled'
                : 'scheduled'
              : 'scheduled';
  const transactionStatus = stageStatus === 'on_hold' ? 'pending' : stageStatus;
  const transaction = await saveTransaction(
    supabase,
    application,
    stepNumber,
    stepKeys[stepNumber],
    transactionStatus,
    transactionType,
    userId,
    {
      scheduledAt: guard.data.scheduled_at,
      assignedReviewerId: guard.data.assigned_reviewer_id,
      assignedReviewerName: guard.data.assigned_reviewer_name,
      rubricData: guard.data.rubric_data,
      notes: guard.data.notes,
      applicantVisibleNotes: guard.data.applicant_visible_notes,
      fromStep: application.current_step,
      toStep: nextStep,
    },
  );
  if (transaction.error || !transaction.id) {
    console.error('Failed to save recruitment stage:', transaction.error);
    return response(
      500,
      { success: false, error: 'Failed to update recruitment stage' },
      guard.corsHeaders,
    );
  }

  const applicationUpdate: RecruitmentApplicationUpdate = {};
  if (stageStatus === 'completed')
    applicationUpdate.current_step = Math.max(application.current_step, nextStep);
  if (stageStatus === 'declined') applicationUpdate.status = 'declined';
  if (stageStatus === 'on_hold') applicationUpdate.status = 'on_hold';
  if (stageStatus === 'pending' && application.status === 'on_hold')
    applicationUpdate.status = 'active';
  if (guard.data.confirmed_role) applicationUpdate.confirmed_role = guard.data.confirmed_role;
  if (guard.data.ccf_vmt_id !== undefined) applicationUpdate.ccf_vmt_id = guard.data.ccf_vmt_id;
  if (guard.data.ccf_vmt_date !== undefined)
    applicationUpdate.ccf_vmt_date = guard.data.ccf_vmt_date;
  if (guard.data.assigned_rfid_member_id !== undefined) {
    applicationUpdate.assigned_rfid_member_id = guard.data.assigned_rfid_member_id;
  }
  if (guard.data.service_commitments)
    applicationUpdate.service_commitments = guard.data.service_commitments;
  if (stepNumber === 7 && stageStatus === 'completed') {
    applicationUpdate.vmt_registered = true;
    applicationUpdate.vmt_registered_at = new Date().toISOString();
    applicationUpdate.vmt_verified_by = userId;
  }
  if (Object.keys(applicationUpdate).length > 0) {
    const { error } = await supabase
      .from('recruitment_applications')
      .update(applicationUpdate)
      .eq('id', application.id);
    if (error) {
      return response(
        500,
        { success: false, error: 'Failed to update application progress' },
        guard.corsHeaders,
      );
    }
  }

  if (guard.data.confirmed_role && guard.data.confirmed_role !== application.confirmed_role) {
    const shouldSkipOnboarding = guard.data.confirmed_role !== 'Prayer Coach';
    const onboarding = await saveTransaction(
      supabase,
      application,
      6,
      'onboarding',
      shouldSkipOnboarding ? 'skipped' : 'pending',
      shouldSkipOnboarding ? 'skipped' : 'scheduled',
      userId,
      { fromStep: 5, toStep: shouldSkipOnboarding ? 7 : 6 },
    );
    if (onboarding.error) {
      return response(
        500,
        { success: false, error: 'Failed to synchronize onboarding step' },
        guard.corsHeaders,
      );
    }
  }

  if (
    stageStatus === 'completed' ||
    stageStatus === 'scheduled' ||
    stageStatus === 'on_hold' ||
    guard.data.applicant_visible_notes
  ) {
    await notifyApplicant(
      supabase,
      { ...application, ...applicationUpdate },
      userId,
      `Recruitment Step ${stepNumber} updated`,
      guard.data.applicant_visible_notes ??
        `Your recruitment progress has advanced to Step ${nextStep}.`,
    );
  }

  return response(
    200,
    {
      success: true,
      current_step: applicationUpdate.current_step ?? application.current_step,
      status: applicationUpdate.status ?? application.status,
    },
    guard.corsHeaders,
  );
}
