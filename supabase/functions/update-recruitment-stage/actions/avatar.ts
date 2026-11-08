import { AVATAR_BUCKET, MAX_IMAGE_BYTES, decodeJpegDataUrl } from '@/shared/image.ts';

import type { RecruitmentActionContext } from '../types.ts';
import { response } from './helpers.ts';

export async function handleUploadAvatar(context: RecruitmentActionContext): Promise<Response> {
  const { supabase, request, application, corsHeaders } = context;

  const imageBytes = decodeJpegDataUrl(request.image_base64!);
  if (!imageBytes || imageBytes.byteLength > MAX_IMAGE_BYTES) {
    return response(
      400,
      { success: false, error: 'Valid JPEG image 1 MB or smaller is required' },
      corsHeaders,
    );
  }

  const avatarObjectKey = `avatars/recruitment/${application.id}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(avatarObjectKey, imageBytes, {
      contentType: 'image/jpeg',
      cacheControl: '0',
      upsert: true,
    });

  if (uploadError) {
    console.error('Failed to upload applicant avatar:', uploadError);
    return response(
      500,
      { success: false, error: `Failed to upload avatar: ${uploadError.message}` },
      corsHeaders,
    );
  }

  const { error: updateError } = await supabase
    .from('recruitment_applications')
    .update({ avatar_object_key: avatarObjectKey, updated_at: new Date().toISOString() })
    .eq('id', application.id);

  if (updateError) {
    console.error('Failed to update application avatar reference:', updateError);
    return response(
      500,
      { success: false, error: `Failed to update applicant: ${updateError.message}` },
      corsHeaders,
    );
  }

  return response(200, { success: true, avatar_object_key: avatarObjectKey }, corsHeaders);
}
