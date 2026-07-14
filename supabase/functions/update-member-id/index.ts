import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { tryConvertRfidInput } from '@/shared/rfid.ts';
import { z } from '@/shared/validation.ts';

const updateMemberIdRequestSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
  member_id: z.string().trim().min(1, 'Member ID cannot be empty'),
});

type UpdateMemberIdRequest = z.infer<typeof updateMemberIdRequestSchema>;

interface UpdateMemberIdSuccess {
  success: true;
  id: string;
  member_id: string;
}

interface UpdateMemberIdError {
  success: false;
  error: string;
  error_code?: string;
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'update-member-id',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'update-member-id',
      windowMs: RATE_LIMIT_PRESETS.createMember.windowMs,
      maxHits: RATE_LIMIT_PRESETS.createMember.maxHits,
    },
    schema: updateMemberIdRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { id, member_id }: UpdateMemberIdRequest = guard.data;
    const trimmedMemberId = tryConvertRfidInput(member_id.trim());
    const adminClient = guard.client;

    // Update member_id
    const { data: updatedMember, error: updateError } = await adminClient
      .from('users')
      .update({ member_id: trimmedMemberId })
      .eq('id', id)
      .select('id, member_id')
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        return jsonResponse(
          corsHeaders,
          {
            success: false,
            error: 'Member ID already exists',
            error_code: 'MEMBER_ID_EXISTS',
          } as UpdateMemberIdError,
          409,
        );
      }

      return errorResponse(corsHeaders, 500, `Database error: ${updateError.message}`);
    }

    if (!updatedMember) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'Member not found',
          error_code: 'MEMBER_NOT_FOUND',
        } as UpdateMemberIdError,
        404,
      );
    }

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        id: updatedMember.id,
        member_id: updatedMember.member_id,
      } as UpdateMemberIdSuccess,
      200,
    );
  } catch {
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
