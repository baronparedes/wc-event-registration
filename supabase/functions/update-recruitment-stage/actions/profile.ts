import type { RecruitmentActionContext, RecruitmentApplicationUpdate } from '../types.ts';
import { getStepKeyForNumber, response, saveTransaction } from './helpers.ts';

export async function handleUpdateProfile(context: RecruitmentActionContext): Promise<Response> {
  const { supabase, request, application, authUser, userId, normalizedEmail, corsHeaders } =
    context;

  const profile = request.profile;
  if (!profile) {
    return response(400, { success: false, error: 'Profile data is required' }, corsHeaders);
  }

  const firstName = profile.first_name.trim();
  const middleName = profile.middle_name?.trim() || null;
  const lastName = profile.last_name.trim();
  const fullName = `${firstName}${middleName ? ` ${middleName}` : ''} ${lastName}`.trim();

  const updatePayload: RecruitmentApplicationUpdate = {
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    full_name: fullName,
    nickname: profile.nickname.trim(),
    email: profile.email.trim().toLowerCase(),
    phone: profile.phone.trim(),
    updated_at: new Date().toISOString(),
  };

  if (profile.date_of_birth) {
    updatePayload.date_of_birth = profile.date_of_birth;
  }
  if (profile.gender) {
    updatePayload.gender = profile.gender;
  }
  if (profile.life_stage) {
    updatePayload.life_stage = profile.life_stage.trim();
  }
  if (profile.personal_details) {
    const existingPersonal =
      typeof application.personal_details === 'object' && application.personal_details !== null
        ? (application.personal_details as Record<string, unknown>)
        : {};
    updatePayload.personal_details = {
      ...existingPersonal,
      ...profile.personal_details,
    };
  }
  if (profile.emergency_contact) {
    const existingEmergency =
      typeof application.emergency_contact === 'object' && application.emergency_contact !== null
        ? (application.emergency_contact as Record<string, unknown>)
        : {};
    updatePayload.emergency_contact = {
      ...existingEmergency,
      ...profile.emergency_contact,
    };
  }

  const { data: updatedApp, error: updateError } = await supabase
    .from('recruitment_applications')
    .update(updatePayload)
    .eq('id', application.id)
    .select()
    .single();

  if (updateError) {
    return response(
      500,
      { success: false, error: `Failed to update applicant profile: ${updateError.message}` },
      corsHeaders,
    );
  }

  // Record audit note in step recruiter notes
  const { data: memberUser } = await supabase
    .from('users')
    .select('full_name')
    .or(`auth_user_id.eq.${userId},email.ilike.${authUser?.email ?? ''}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const authorName =
    memberUser?.full_name ||
    (authUser?.user_metadata?.full_name as string | undefined) ||
    authUser?.email?.split('@')[0] ||
    normalizedEmail;

  const stepKey = getStepKeyForNumber(application.current_step);
  await saveTransaction(
    supabase,
    application,
    application.current_step,
    stepKey,
    'pending',
    'completed',
    userId,
    {
      notes: `Profile details updated by recruiter (${authorName})`,
      assignedReviewerId: userId,
      assignedReviewerName: authorName,
    },
  );

  return response(200, { success: true, application: updatedApp }, corsHeaders);
}
