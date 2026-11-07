import { completeVmtResultSchema } from '../schemas.ts';
import type { RecruitmentActionContext } from '../types.ts';
import { response } from './helpers.ts';

export async function handleCompleteVmt(context: RecruitmentActionContext): Promise<Response> {
  const { supabase, application, userId, normalizedEmail, corsHeaders } = context;

  if (application.current_step !== 7) {
    return response(
      409,
      { success: false, error: 'CCF VMT registration is not the current step' },
      corsHeaders,
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

  if (completionError || !completionData) {
    console.error('Failed to atomically complete CCF VMT registration:', completionError);
    return response(
      409,
      { success: false, error: 'Failed to complete CCF VMT registration' },
      corsHeaders,
    );
  }

  const parsedCompletion = completeVmtResultSchema.safeParse(completionData);
  if (!parsedCompletion.success) {
    console.error('Invalid VMT completion RPC result payload:', completionData);
    return response(500, { success: false, error: 'Invalid VMT completion response' }, corsHeaders);
  }

  return response(
    200,
    {
      success: true,
      application_id: application.id,
      current_step: parsedCompletion.data.current_step,
      vmt_registered: true,
    },
    corsHeaders,
  );
}
