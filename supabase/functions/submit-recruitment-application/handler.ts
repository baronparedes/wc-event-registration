import { createApprovalRequest, enqueueApprovalReviewEmail } from '../_shared/approvals.ts';
import { RATE_LIMIT_PRESETS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { z } from '../_shared/validation.ts';
import { calculateAge, hasMinimumTenure, submitRecruitmentApplicationSchema } from './schemas.ts';

const surveyQuestionSchema = z.object({
  field_key: z.string().trim().min(1),
  is_active: z.boolean().optional().default(true),
  is_required: z.boolean().optional().default(true),
  correct_answer: z.enum(['true', 'false']),
});

const recruitmentSettingsSchema = z.object({
  is_recruitment_open: z.boolean(),
  eligibility_rules: z.object({
    min_age: z.number().int().min(0).default(18),
    max_age: z.number().int().min(0).default(45),
    requires_glc1_completed: z.boolean().default(true),
    min_dgroup_months: z.number().int().min(0).default(6),
  }),
  survey_questions: z.array(surveyQuestionSchema),
});

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function removeIncompleteApplication(
  supabase: ReturnType<typeof useEdgeHook> extends Promise<infer Guard>
    ? Guard extends { client: infer Client }
      ? Client
      : never
    : never,
  applicationId: string,
  approvalId?: string,
): Promise<void> {
  await supabase.from('recruitment_applications').delete().eq('id', applicationId);
  if (approvalId) {
    await supabase.from('approval_requests').delete().eq('id', approvalId);
  }
}

export async function handleSubmitRecruitmentApplication(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'submit-recruitment-application',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin', 'kiosk', 'vmt'],
    schema: submitRecruitmentApplicationSchema,
    publicRateLimit: {
      scope: 'submit-recruitment-application',
      windowMs: RATE_LIMIT_PRESETS.submitRegistration.windowMs,
      maxHits: RATE_LIMIT_PRESETS.submitRegistration.maxHits,
    },
  });

  if (!guard.valid) {
    return guard.response;
  }

  const application = guard.data;
  const supabase = guard.client;

  const { data: settingsData, error: settingsError } = await supabase
    .from('recruitment_settings')
    .select('is_recruitment_open, eligibility_rules, survey_questions')
    .eq('id', 1)
    .maybeSingle();

  if (settingsError || !settingsData) {
    console.error('Recruitment settings lookup failed:', settingsError);
    return jsonResponse(
      503,
      {
        success: false,
        error: 'Recruitment is temporarily unavailable',
        error_code: 'SETTINGS_UNAVAILABLE',
      },
      guard.corsHeaders,
    );
  }

  const settingsResult = recruitmentSettingsSchema.safeParse(settingsData);
  if (!settingsResult.success) {
    console.error('Recruitment settings are invalid:', settingsResult.error.flatten());
    return jsonResponse(
      500,
      {
        success: false,
        error: 'Recruitment is temporarily unavailable',
        error_code: 'INVALID_SETTINGS',
      },
      guard.corsHeaders,
    );
  }

  const settings = settingsResult.data;
  if (!settings.is_recruitment_open) {
    return jsonResponse(
      403,
      {
        success: false,
        error: 'Recruitment applications are currently closed',
        error_code: 'RECRUITMENT_CLOSED',
      },
      guard.corsHeaders,
    );
  }

  const age = calculateAge(application.date_of_birth);
  const {
    min_age: minAge,
    max_age: maxAge,
    min_dgroup_months: minDgroupMonths,
  } = settings.eligibility_rules;
  if (age < minAge || age > maxAge) {
    return jsonResponse(
      400,
      {
        success: false,
        error: `Applicants must be between ${minAge} and ${maxAge} years old`,
        error_code: 'AGE_REQUIREMENT_NOT_MET',
      },
      guard.corsHeaders,
    );
  }

  if (
    (settings.eligibility_rules.requires_glc1_completed &&
      application.spiritual_background.glc1_status !== 'Completed') ||
    !application.dgroup_info.is_constant_attendee ||
    !hasMinimumTenure(application.dgroup_info.member_since, minDgroupMonths)
  ) {
    return jsonResponse(
      400,
      {
        success: false,
        error:
          'Applicants must have completed GLC 1 and regularly attended a DGroup for the required period',
        error_code: 'MINISTRY_ELIGIBILITY_NOT_MET',
      },
      guard.corsHeaders,
    );
  }

  const activeSurveyQuestions = settings.survey_questions.filter((question) => question.is_active);
  const expectedSurveyKeys = new Set(activeSurveyQuestions.map((question) => question.field_key));
  const submittedSurveyKeys = Object.keys(application.survey_answers);
  if (
    activeSurveyQuestions.length === 0 ||
    submittedSurveyKeys.some((fieldKey) => !expectedSurveyKeys.has(fieldKey)) ||
    activeSurveyQuestions.some(
      (question) => question.is_required && !(question.field_key in application.survey_answers),
    )
  ) {
    return jsonResponse(
      400,
      {
        success: false,
        error: 'Please answer all active survey questions',
        error_code: 'SURVEY_ANSWERS_INVALID',
      },
      guard.corsHeaders,
    );
  }

  const surveyScore = activeSurveyQuestions.reduce(
    (score, question) =>
      score + Number(application.survey_answers[question.field_key] === question.correct_answer),
    0,
  );
  const fullName = [application.first_name, application.middle_name, application.last_name]
    .filter((name): name is string => Boolean(name?.trim()))
    .join(' ');
  const now = new Date().toISOString();

  const { data: createdApplication, error: applicationError } = await supabase
    .from('recruitment_applications')
    .insert({
      auth_user_id: null,
      email: application.email,
      first_name: application.first_name,
      middle_name: application.middle_name || null,
      last_name: application.last_name,
      full_name: fullName,
      nickname: application.nickname,
      phone: application.phone,
      date_of_birth: application.date_of_birth,
      gender: application.gender,
      life_stage: application.life_stage,
      desired_role: application.desired_role,
      personal_details: application.personal_details,
      emergency_contact: application.emergency_contact,
      application_history: application.application_history,
      spiritual_background: application.spiritual_background,
      dgroup_info: application.dgroup_info,
      applicant_attested_at: now,
      survey_answers: application.survey_answers,
      survey_score: surveyScore,
      survey_total: activeSurveyQuestions.length,
      current_step: 2,
      status: 'active',
    })
    .select('id')
    .single();

  if (applicationError || !createdApplication) {
    console.error('Failed to create recruitment application:', applicationError);
    return jsonResponse(
      500,
      {
        success: false,
        error: 'Failed to submit application',
        error_code: 'APPLICATION_CREATE_FAILED',
      },
      guard.corsHeaders,
    );
  }

  const needsPrayerCoachOnboarding = application.desired_role === 'Prayer Coach';
  const { error: transactionError } = await supabase
    .from('recruitment_pipeline_transactions')
    .insert([
      {
        application_id: createdApplication.id,
        step_number: 1,
        step_key: 'register',
        attempt_number: 1,
        transaction_type: 'completed',
        from_step: 1,
        to_step: 2,
        status: 'completed',
        completed_at: now,
      },
      {
        application_id: createdApplication.id,
        step_number: 2,
        step_key: 'interview',
        attempt_number: 1,
        transaction_type: 'scheduled',
        from_step: 1,
        to_step: 2,
        status: 'pending',
      },
      {
        application_id: createdApplication.id,
        step_number: 6,
        step_key: 'onboarding',
        attempt_number: 1,
        transaction_type: needsPrayerCoachOnboarding ? 'scheduled' : 'skipped',
        from_step: 5,
        to_step: needsPrayerCoachOnboarding ? 6 : 7,
        status: needsPrayerCoachOnboarding ? 'pending' : 'skipped',
      },
    ]);

  if (transactionError) {
    console.error('Failed to create initial recruitment steps:', transactionError);
    await removeIncompleteApplication(supabase, createdApplication.id);
    return jsonResponse(
      500,
      {
        success: false,
        error: 'Failed to submit application',
        error_code: 'PIPELINE_CREATE_FAILED',
      },
      guard.corsHeaders,
    );
  }

  const approvalResult = await createApprovalRequest(supabase, {
    entityType: 'recruitment_endorsement',
    entityId: createdApplication.id,
    title: `Welcome Center endorsement for ${fullName}`,
    summary: `Please review the Welcome Center volunteer application for ${fullName}.`,
    requesterName: fullName,
    requesterEmail: application.email,
    assignedToEmail: application.dgroup_info.leader_email,
    metadata: { application_id: createdApplication.id },
  });

  if (!approvalResult.success || !approvalResult.approval) {
    console.error('Failed to create DGroup endorsement request:', approvalResult.error);
    await removeIncompleteApplication(supabase, createdApplication.id);
    return jsonResponse(
      500,
      {
        success: false,
        error: 'Failed to submit application',
        error_code: 'ENDORSEMENT_CREATE_FAILED',
      },
      guard.corsHeaders,
    );
  }

  const { error: linkError } = await supabase
    .from('recruitment_applications')
    .update({ dgroup_approval_id: approvalResult.approval.id })
    .eq('id', createdApplication.id);

  if (linkError) {
    console.error('Failed to link DGroup endorsement request:', linkError);
    await removeIncompleteApplication(supabase, createdApplication.id, approvalResult.approval.id);
    return jsonResponse(
      500,
      {
        success: false,
        error: 'Failed to submit application',
        error_code: 'ENDORSEMENT_LINK_FAILED',
      },
      guard.corsHeaders,
    );
  }

  const emailResult = await enqueueApprovalReviewEmail(supabase, {
    assignedToEmail: application.dgroup_info.leader_email,
    subjectTitle: `Welcome Center Volunteer Endorsement - ${fullName}`,
    heading: 'DGroup Leader Endorsement Required',
    description: 'A member of your DGroup has applied to serve in the Welcome Center ministry.',
    details: [
      { label: 'Applicant', value: fullName },
      { label: 'Desired Role', value: application.desired_role },
    ],
    accessToken: approvalResult.approval.access_token,
    approvalId: approvalResult.approval.id,
  });

  if (!emailResult.success) {
    console.error('Failed to queue DGroup endorsement email');
    await removeIncompleteApplication(supabase, createdApplication.id, approvalResult.approval.id);
    return jsonResponse(
      500,
      {
        success: false,
        error: 'Failed to submit application',
        error_code: 'ENDORSEMENT_EMAIL_FAILED',
      },
      guard.corsHeaders,
    );
  }

  return jsonResponse(
    201,
    {
      success: true,
      application_id: createdApplication.id,
      current_step: 2,
      status: 'active',
    },
    guard.corsHeaders,
  );
}
