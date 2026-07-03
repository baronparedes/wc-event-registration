import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

import { POSTGRES_ERROR_CODES, RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  logAdminAction,
  readAllowedOrigins,
  requireAdminAccess,
} from '@/shared/security.ts';
import { parseFunctionEnvironment, parseRequestBody, z } from '@/shared/validation.ts';

const createMemberRequestSchema = z.object({
  member_id: z.string().trim().min(1, 'Member ID is required'),
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  nickname: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  role: z.string().trim().min(1, 'Role is required'),
  category: z.string().trim().min(1, 'Category is required'),
});

type CreateMemberRequest = z.infer<typeof createMemberRequestSchema>;

interface CreateMemberSuccess {
  success: true;
  id: string;
  member_id: string;
  full_name: string;
}

interface CreateMemberError {
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

  console.log('[create-member]', {
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

    console.log('[create-member] env/auth check', {
      requestId,
      hasSupabaseUrl: Boolean(env?.supabaseUrl),
      hasServiceRoleKey: Boolean(env?.supabaseServiceKey),
      hasAuthHeader: Boolean(authHeader),
    });

    if (!env) {
      return errorResponse(corsHeaders, 500, 'Environment not configured');
    }
    const { supabaseUrl, supabaseServiceKey } = env;

    const parsedBody = await parseRequestBody(req, createMemberRequestSchema);
    if (!parsedBody.success) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: parsedBody.error,
          detail: parsedBody.details,
          error_code: 'INVALID_REQUEST',
        } as CreateMemberError,
        400,
      );
    }

    const body: CreateMemberRequest = parsedBody.data;
    const {
      member_id,
      first_name,
      last_name,
      nickname,
      email,
      phone,
      date_of_birth,
      role,
      category,
    } = body;

    console.log('[create-member] parsed body', {
      requestId,
      memberId: maskValue(member_id ?? null),
      firstName: maskValue(first_name ?? null),
      lastName: maskValue(last_name ?? null),
      hasMemberId: Boolean(member_id),
      hasFirstName: Boolean(first_name),
      hasLastName: Boolean(last_name),
      hasRole: Boolean(role),
      hasCategory: Boolean(category),
    });

    const normalizedFirstName = first_name.trim();
    const normalizedLastName = last_name.trim();
    const normalizedRole = role.trim();
    const normalizedCategory = category.trim();
    const derivedFullName = `${normalizedFirstName} ${normalizedLastName}`;

    // Require admin access
    const adminAccess = await requireAdminAccess({
      requestId,
      logPrefix: 'create-member',
      supabaseUrl,
      supabaseServiceKey,
      authHeader,
      corsHeaders,
      rateLimit: {
        scope: 'create-member',
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

    // Build metadata object with role and category
    const metadata: Record<string, unknown> = {
      role: normalizedRole,
      category: normalizedCategory,
    };

    // Helper to normalize empty strings to null
    const toNull = (val: string | null | undefined): string | null => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    // Insert new member
    const { data: newMember, error: insertError } = await adminClient
      .from('users')
      .insert({
        member_id: member_id.trim(),
        full_name: derivedFullName,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        nickname: toNull(nickname),
        email: toNull(email),
        phone: toNull(phone),
        date_of_birth: toNull(date_of_birth),
        metadata,
      })
      .select('id, member_id, full_name')
      .single();

    console.log('[create-member] insert result', {
      requestId,
      memberId: maskValue(member_id),
      fullName: maskValue(derivedFullName),
      insertErrorCode: insertError?.code ?? null,
      insertErrorDetails: insertError?.details ?? null,
      hasNewMember: Boolean(newMember),
    });

    if (insertError) {
      // Check for specific error types
      if (insertError.code === POSTGRES_ERROR_CODES.uniqueViolation) {
        // Unique constraint violation for member_id
        return jsonResponse(
          corsHeaders,
          {
            success: false,
            error: `Member ID "${member_id}" already exists`,
            error_code: 'MEMBER_ID_DUPLICATE',
          } as CreateMemberError,
          409,
        );
      }

      // Generic error
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: insertError.message || 'Failed to create member',
          error_code: insertError.code || 'INSERT_FAILED',
        } as CreateMemberError,
        400,
      );
    }

    if (!newMember) {
      return errorResponse(
        corsHeaders,
        500,
        'Member created but could not retrieve record',
        undefined,
        { error_code: 'RETRIEVE_FAILED' },
      );
    }

    // Log the action
    await logAdminAction({
      supabaseUrl,
      supabaseServiceKey,
      action: 'create_member',
      adminId: adminAccess.adminId,
      details: {
        memberId: newMember.member_id,
        fullName: newMember.full_name,
      },
      requestId,
    });

    console.log('[create-member] success', {
      requestId,
      memberId: maskValue(newMember.member_id),
      fullName: maskValue(newMember.full_name),
    });

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        id: newMember.id,
        member_id: newMember.member_id,
        full_name: newMember.full_name,
      } as CreateMemberSuccess,
      201,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[create-member] error', {
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return errorResponse(corsHeaders, 500, 'An unexpected error occurred', undefined, {
      error_code: 'INTERNAL_ERROR',
    });
  }
});
