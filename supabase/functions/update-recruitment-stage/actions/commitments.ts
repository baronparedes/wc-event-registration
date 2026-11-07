import type { RecruitmentActionContext } from '../types.ts';
import { asJson, response } from './helpers.ts';

export async function handleSaveCommitments(context: RecruitmentActionContext): Promise<Response> {
  const { supabase, request, application, isReviewer, corsHeaders } = context;

  const commitments = request.service_commitments;
  if (!commitments) {
    return response(
      400,
      { success: false, error: 'No Sunday service commitments provided' },
      corsHeaders,
    );
  }

  if (application.current_step !== 8 && !isReviewer) {
    return response(
      409,
      { success: false, error: 'Sunday commitments can only be saved at Step 8' },
      corsHeaders,
    );
  }

  const { error: updateError } = await supabase
    .from('recruitment_applications')
    .update({ service_commitments: asJson(commitments) })
    .eq('id', application.id);

  if (updateError) {
    return response(500, { success: false, error: updateError.message }, corsHeaders);
  }

  return response(200, { success: true, application_id: application.id }, corsHeaders);
}
