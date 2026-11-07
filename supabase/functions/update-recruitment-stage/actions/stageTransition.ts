import type {
  RecruitmentActionContext,
  RecruitmentApplicationUpdate,
  TransactionType,
} from '../types.ts';
import {
  findLatestTransaction,
  nextStepForCompletion,
  notifyApplicant,
  overrideRoles,
  response,
  saveTransaction,
} from './helpers.ts';

const STAGE_STATUS_TRANSACTION_TYPE_MAP: Partial<Record<string, TransactionType>> = {
  completed: 'completed',
  declined: 'declined',
  skipped: 'skipped',
  on_hold: 'archived',
  archived: 'archived',
};

function resolveTransitionTransactionType(
  stageStatus: string,
  hasSchedule: boolean,
  wasScheduled: boolean,
): TransactionType {
  const mapped = STAGE_STATUS_TRANSACTION_TYPE_MAP[stageStatus];
  if (mapped) return mapped;
  if (hasSchedule && wasScheduled) return 'rescheduled';
  return 'scheduled';
}

export async function handleUpdateStage(context: RecruitmentActionContext): Promise<Response> {
  const {
    supabase,
    request,
    application,
    authUser,
    userId,
    normalizedEmail,
    adminRole,
    corsHeaders,
  } = context;

  if (!request.step_number || !request.status) {
    return response(
      400,
      { success: false, error: 'A valid stage update is required' },
      corsHeaders,
    );
  }

  const stepNumber = request.step_number;
  const stageStatus = request.status;
  const overrideGate = request.override_endorsement_gate;
  const allowedSteps = application.current_step === 2 ? [2, 3] : [application.current_step];
  if (!allowedSteps.includes(stepNumber)) {
    return response(409, { success: false, error: 'Stage update is out of sequence' }, corsHeaders);
  }
  if (request.confirmed_role && stepNumber > 5) {
    return response(
      400,
      { success: false, error: 'Confirmed role can only be changed through evaluation' },
      corsHeaders,
    );
  }
  if (overrideGate && !overrideRoles.has(adminRole ?? '')) {
    return response(
      403,
      { success: false, error: 'Only admins can override the endorsement gate' },
      corsHeaders,
    );
  }

  let orientationAlreadyCompleted = false;
  if (stageStatus === 'completed' && stepNumber === 2) {
    const orientation = await findLatestTransaction(supabase, application.id, 3);
    if (orientation.error) {
      return response(
        500,
        { success: false, error: 'Failed to read orientation progress' },
        corsHeaders,
      );
    }
    orientationAlreadyCompleted = orientation.data?.status === 'completed';
  }
  const nextStep =
    stageStatus === 'completed'
      ? nextStepForCompletion(
          stepNumber,
          request.confirmed_role ?? application.confirmed_role,
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
        corsHeaders,
      );
    }
  }

  if (stageStatus === 'completed' && stepNumber === 5) {
    const role = request.confirmed_role ?? application.confirmed_role;
    if (!role) {
      return response(
        400,
        { success: false, error: 'A confirmed role is required to complete evaluation' },
        corsHeaders,
      );
    }
  }
  if (stageStatus === 'completed' && stepNumber === 7) {
    if (
      !(request.ccf_vmt_id ?? application.ccf_vmt_id) ||
      !(request.ccf_vmt_date ?? application.ccf_vmt_date)
    ) {
      return response(
        400,
        { success: false, error: 'CCF VMT ID and date are required to complete Step 7' },
        corsHeaders,
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
      corsHeaders,
    );
  }
  const wasScheduled = Boolean(latest.data?.status === 'scheduled');

  if (stageStatus === 'completed' && stepNumber >= 2 && stepNumber <= 6 && !wasScheduled) {
    return response(
      409,
      {
        success: false,
        error: `Step ${stepNumber} must be scheduled before it can be completed`,
      },
      corsHeaders,
    );
  }

  const hasReviewer =
    Boolean(request.assigned_reviewer_id?.trim() || request.assigned_reviewer_name?.trim()) ||
    (request.assigned_reviewer_id === undefined &&
      Boolean(latest.data?.assigned_reviewer_id || latest.data?.assigned_reviewer_name || userId));

  if (stageStatus === 'completed' && stepNumber >= 2 && stepNumber <= 5 && !hasReviewer) {
    return response(
      400,
      {
        success: false,
        error: `An assigned reviewer / coach is required before completing Step ${stepNumber}`,
      },
      corsHeaders,
    );
  }
  const transactionType = resolveTransitionTransactionType(
    stageStatus,
    Boolean(request.scheduled_at),
    wasScheduled,
  );
  const transactionStatus =
    stageStatus === 'on_hold' || stageStatus === 'archived' ? 'pending' : stageStatus;

  const transaction = await saveTransaction(
    supabase,
    application,
    stepNumber,
    stepKeys[stepNumber],
    transactionStatus,
    transactionType,
    userId,
    {
      scheduledAt: request.scheduled_at,
      assignedReviewerId: request.assigned_reviewer_id,
      assignedReviewerName: request.assigned_reviewer_name,
      rubricData: request.rubric_data,
      notes: request.notes,
      fromStep: application.current_step,
      toStep: nextStep,
    },
  );
  if (transaction.error || !transaction.id) {
    console.error('Failed to save recruitment stage:', transaction.error);
    return response(
      500,
      { success: false, error: 'Failed to update recruitment stage' },
      corsHeaders,
    );
  }

  if (request.notes?.trim()) {
    const { data: memberUser } = await supabase
      .from('users')
      .select('id, full_name, nickname, avatar_object_key')
      .or(`auth_user_id.eq.${userId},email.ilike.${normalizedEmail}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const authorName =
      request.assigned_reviewer_name?.trim() ||
      memberUser?.full_name ||
      (authUser?.user_metadata?.full_name as string | undefined) ||
      (authUser?.user_metadata?.name as string | undefined) ||
      authUser?.email?.split('@')[0] ||
      'Recruitment Reviewer';
    const authorRole = adminRole ? adminRole.toUpperCase() : null;
    const avatarObjectKey = memberUser?.avatar_object_key ?? null;

    const { error: noteInsertError } = await supabase.from('recruitment_step_notes').insert({
      application_id: application.id,
      step_number: stepNumber,
      attempt_number: latest.data?.attempt_number ?? 1,
      transaction_id: transaction.id,
      author_id: userId,
      author_name: authorName,
      author_role: authorRole,
      avatar_object_key: avatarObjectKey,
      content: request.notes.trim(),
    });
    if (noteInsertError) {
      console.warn('Failed to record recruiter note during stage transition:', noteInsertError);
    }
  }

  const applicationUpdate: RecruitmentApplicationUpdate = {};
  if (stageStatus === 'completed')
    applicationUpdate.current_step = Math.max(application.current_step, nextStep);
  if (stageStatus === 'declined') applicationUpdate.status = 'declined';
  if (stageStatus === 'on_hold' || stageStatus === 'archived')
    applicationUpdate.status = 'archived';
  if (
    stageStatus === 'pending' &&
    (application.status === 'on_hold' || application.status === 'archived')
  )
    applicationUpdate.status = 'active';
  if (request.confirmed_role) applicationUpdate.confirmed_role = request.confirmed_role;
  if (request.ccf_vmt_id !== undefined) applicationUpdate.ccf_vmt_id = request.ccf_vmt_id;
  if (request.ccf_vmt_date !== undefined) applicationUpdate.ccf_vmt_date = request.ccf_vmt_date;
  if (request.assigned_rfid_member_id !== undefined) {
    applicationUpdate.assigned_rfid_member_id = request.assigned_rfid_member_id;
  }
  if (request.service_commitments)
    applicationUpdate.service_commitments = request.service_commitments;
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
        corsHeaders,
      );
    }
  }

  if (request.confirmed_role && request.confirmed_role !== application.confirmed_role) {
    const shouldSkipOnboarding = request.confirmed_role !== 'Prayer Coach';
    const targetStatus = shouldSkipOnboarding ? 'skipped' : 'pending';
    const targetType = shouldSkipOnboarding ? 'skipped' : 'scheduled';

    const latestStep6 = await findLatestTransaction(supabase, application.id, 6);
    const currentStatus = latestStep6.data?.status;

    // Only synchronize if Step 6 is not already in the target state
    if (currentStatus !== targetStatus) {
      if (latestStep6.data?.id) {
        // Update the existing Step 6 transaction in place instead of creating duplicate attempt records
        const { error: updateError } = await supabase
          .from('recruitment_pipeline_transactions')
          .update({
            status: targetStatus,
            transaction_type: targetType,
            to_step: shouldSkipOnboarding ? 7 : 6,
            from_step: 5,
            notes: shouldSkipOnboarding
              ? 'Onboarding skipped (role does not require Prayer Coach onboarding)'
              : 'Onboarding required for confirmed Prayer Coach role',
          })
          .eq('id', latestStep6.data.id);

        if (updateError) {
          return response(
            500,
            { success: false, error: 'Failed to synchronize onboarding step' },
            corsHeaders,
          );
        }
      } else {
        const onboarding = await saveTransaction(
          supabase,
          application,
          6,
          'onboarding',
          targetStatus,
          targetType,
          userId,
          { fromStep: 5, toStep: shouldSkipOnboarding ? 7 : 6 },
        );
        if (onboarding.error) {
          return response(
            500,
            { success: false, error: 'Failed to synchronize onboarding step' },
            corsHeaders,
          );
        }
      }
    }
  }

  if (stageStatus === 'completed' || stageStatus === 'scheduled' || stageStatus === 'on_hold') {
    await notifyApplicant(
      supabase,
      { ...application, ...applicationUpdate },
      userId,
      `Recruitment Step ${stepNumber} updated`,
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
    corsHeaders,
  );
}
