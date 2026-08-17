import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const BUCKET = 'member_avatars';
const MAX_BASE64_LENGTH = 1_500_000;
const MAX_IMAGE_BYTES = 1_048_576;

const uploadMemberAvatarRequestSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
  image_base64: z.string().max(MAX_BASE64_LENGTH, 'Image must be 1 MB or smaller'),
});

function decodeJpegDataUrl(dataUrl: string): Uint8Array | null {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) return null;

  try {
    const binary = atob(match[1]);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const isJpeg =
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[bytes.length - 2] === 0xff &&
      bytes[bytes.length - 1] === 0xd9;
    return isJpeg ? bytes : null;
  } catch {
    return null;
  }
}

function toJpegObjectKey(currentKey: string | null, memberId: string): string {
  const baseKey = (currentKey?.trim() || `avatars/member/${memberId}`).replace(/\.jpe?g$/i, '');
  return `${baseKey}.jpg`;
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'upload-member-avatar',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin'],
    rateLimit: {
      scope: 'upload-member-avatar',
      windowMs: RATE_LIMIT_PRESETS.createMember.windowMs,
      maxHits: RATE_LIMIT_PRESETS.createMember.maxHits,
    },
    schema: uploadMemberAvatarRequestSchema,
  });

  if (!guard.valid) return guard.response;

  const { id, image_base64 } = guard.data;
  const imageBytes = decodeJpegDataUrl(image_base64);
  if (!imageBytes) {
    return errorResponse(guard.corsHeaders, 400, 'A valid JPEG image is required');
  }
  if (imageBytes.byteLength > MAX_IMAGE_BYTES) {
    return errorResponse(guard.corsHeaders, 400, 'Image must be 1 MB or smaller');
  }

  const { data: member, error: memberError } = await guard.client
    .from('users')
    .select('avatar_object_key')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle<{ avatar_object_key: string | null }>();

  if (memberError) return errorResponse(guard.corsHeaders, 500, memberError.message);
  if (!member) return errorResponse(guard.corsHeaders, 404, 'Member not found');

  const avatarObjectKey = toJpegObjectKey(member.avatar_object_key, id);
  const { error: uploadError } = await guard.client.storage
    .from(BUCKET)
    .upload(avatarObjectKey, imageBytes, {
      contentType: 'image/jpeg',
      cacheControl: '0',
      upsert: true,
    });

  if (uploadError) return errorResponse(guard.corsHeaders, 500, uploadError.message);

  const { data: updatedMember, error: updateError } = await guard.client
    .from('users')
    .update({ avatar_object_key: avatarObjectKey } as never)
    .eq('id', id)
    .select('id')
    .single();

  if (updateError) return errorResponse(guard.corsHeaders, 500, updateError.message);
  if (!updatedMember) return errorResponse(guard.corsHeaders, 404, 'Member not found');

  return jsonResponse(
    guard.corsHeaders,
    {
      success: true,
      avatar_object_key: avatarObjectKey,
    },
    200,
  );
});
