import { POSTGRES_ERROR_CODES, RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

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

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'create-member',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'create-member',
      windowMs: RATE_LIMIT_PRESETS.createMember.windowMs,
      maxHits: RATE_LIMIT_PRESETS.createMember.maxHits,
    },
    schema: createMemberRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const body: CreateMemberRequest = guard.data;
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

    const normalizedFirstName = first_name.trim();
    const normalizedLastName = last_name.trim();
    const normalizedRole = role.trim();
    const normalizedCategory = category.trim();
    const derivedFullName = `${normalizedFirstName} ${normalizedLastName}`;

    const adminClient = guard.client;

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
        role: normalizedRole,
        category: normalizedCategory,
      })
      .select('id, member_id, full_name')
      .single();

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
  } catch {
    return errorResponse(corsHeaders, 500, 'An unexpected error occurred', undefined, {
      error_code: 'INTERNAL_ERROR',
    });
  }
});
