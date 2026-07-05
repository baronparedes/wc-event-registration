import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { tryConvertRfidInput } from '@/shared/rfid.ts';
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  readAllowedOrigins,
  requireAdminAccess,
} from '@/shared/security.ts';
import { parseFunctionEnvironment, parseRequestBody, z } from '@/shared/validation.ts';

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

const allowedOrigins = readAllowedOrigins();

function maskValue(value: string | null, visible = 6): string {
  if (!value) return 'null';
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

  console.log('[update-member-id]', {
    requestId,
    method: req.method,
    origin,
    hasAuthorizationHeader: Boolean(req.headers.get('authorization')),
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return createObscuredDenyResponse(corsHeaders);
    }

    return new Response('ok', { headers: corsHeaders });
  }

  if (!isOriginAllowed(origin, allowedOrigins)) {
    return createObscuredDenyResponse(corsHeaders);
  }

  if (req.method !== 'POST') {
    return jsonResponse(corsHeaders, { success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const env = parseFunctionEnvironment();
    const authHeader = req.headers.get('authorization');

    console.log('[update-member-id] env/auth check', {
      requestId,
      hasSupabaseUrl: Boolean(env?.supabaseUrl),
      hasServiceRoleKey: Boolean(env?.supabaseServiceKey),
      hasAuthHeader: Boolean(authHeader),
    });

    if (!env) {
      return errorResponse(corsHeaders, 500, 'Environment not configured');
    }
    const { supabaseUrl, supabaseServiceKey } = env;

    const parsedBody = await parseRequestBody(req, updateMemberIdRequestSchema);
    if (!parsedBody.success) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: parsedBody.error,
          detail: parsedBody.details,
          error_code: 'INVALID_REQUEST',
        } as UpdateMemberIdError,
        400,
      );
    }

    const { id, member_id }: UpdateMemberIdRequest = parsedBody.data;
    const trimmedMemberId = tryConvertRfidInput(member_id.trim());

    console.log('[update-member-id] parsed body', {
      requestId,
      memberId: maskValue(id),
      newMemberId: maskValue(trimmedMemberId),
    });

    // Require admin access
    const adminAccess = await requireAdminAccess({
      requestId,
      logPrefix: 'update-member-id',
      supabaseUrl,
      supabaseServiceKey,
      authHeader,
      corsHeaders,
      rateLimit: {
        scope: 'update-member-id',
        windowMs: RATE_LIMIT_PRESETS.createMember.windowMs,
        maxHits: RATE_LIMIT_PRESETS.createMember.maxHits,
      },
    });

    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    // Create service role client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Update member_id
    const { data: updatedMember, error: updateError } = await adminClient
      .from('users')
      .update({ member_id: trimmedMemberId })
      .eq('id', id)
      .select('id, member_id')
      .single();

    console.log('[update-member-id] update result', {
      requestId,
      memberId: maskValue(id),
      newMemberId: maskValue(trimmedMemberId),
      updateErrorCode: updateError?.code ?? null,
      updateErrorMessage: updateError?.message ?? null,
    });

    if (updateError) {
      console.error('[update-member-id] update error', {
        requestId,
        errorCode: updateError.code,
        errorMessage: updateError.message,
      });

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

    console.log('[update-member-id] success', {
      requestId,
      memberId: maskValue(updatedMember.id),
      updatedMemberId: maskValue(updatedMember.member_id),
    });

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        id: updatedMember.id,
        member_id: updatedMember.member_id,
      } as UpdateMemberIdSuccess,
      200,
    );
  } catch (err) {
    console.error('[update-member-id] unexpected error', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
