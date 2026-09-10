import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const assignableRoleSchema = z.enum(['admin', 'slod', 'imt', 'kiosk']);

const manageAdminRoleRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('assign'),
    auth_user_id: z.string().uuid('auth_user_id must be a valid UUID'),
    role: assignableRoleSchema,
  }),
  z.object({
    action: z.literal('update'),
    admin_id: z.string().uuid('admin_id must be a valid UUID'),
    role: assignableRoleSchema,
  }),
  z.object({
    action: z.literal('revoke'),
    admin_id: z.string().uuid('admin_id must be a valid UUID'),
  }),
]);

type ManageAdminRoleRequest = z.infer<typeof manageAdminRoleRequestSchema>;

function invalidTargetResponse(corsHeaders: Record<string, string>): Response {
  return jsonResponse(
    corsHeaders,
    {
      success: false,
      error: 'Super admin assignments cannot be changed',
      error_code: 'PROTECTED_ROLE',
    },
    409,
  );
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'manage-admin-role',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['super_admin'],
    rateLimit: {
      scope: 'manage-admin-role',
      windowMs: RATE_LIMIT_PRESETS.adminRoleManagement.windowMs,
      maxHits: RATE_LIMIT_PRESETS.adminRoleManagement.maxHits,
    },
    schema: manageAdminRoleRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const payload: ManageAdminRoleRequest = guard.data;
    const adminClient = guard.client;

    if (payload.action === 'assign') {
      const { data: existing, error: lookupError } = await adminClient
        .from('admins')
        .select('id, role')
        .eq('auth_user_id', payload.auth_user_id)
        .maybeSingle<{ id: string; role: string }>();

      if (lookupError) {
        return errorResponse(corsHeaders, 500, 'Failed to verify existing admin role');
      }

      if (existing?.role === 'super_admin') {
        return invalidTargetResponse(corsHeaders);
      }

      const { data, error } = await adminClient
        .from('admins')
        .upsert(
          { auth_user_id: payload.auth_user_id, role: payload.role },
          { onConflict: 'auth_user_id' },
        )
        .select('id, auth_user_id, role, created_at')
        .single();

      if (error) {
        return errorResponse(corsHeaders, 500, 'Failed to assign admin role');
      }

      return jsonResponse(corsHeaders, { success: true, data }, 200);
    }

    const { data: existing, error: lookupError } = await adminClient
      .from('admins')
      .select('id, role')
      .eq('id', payload.admin_id)
      .maybeSingle<{ id: string; role: string }>();

    if (lookupError) {
      return errorResponse(corsHeaders, 500, 'Failed to verify existing admin role');
    }

    if (!existing) {
      return errorResponse(corsHeaders, 404, 'Admin role not found', undefined, {
        error_code: 'ADMIN_ROLE_NOT_FOUND',
      });
    }

    if (existing.role === 'super_admin') {
      return invalidTargetResponse(corsHeaders);
    }

    if (payload.action === 'revoke') {
      const { error } = await adminClient.from('admins').delete().eq('id', payload.admin_id);

      if (error) {
        return errorResponse(corsHeaders, 500, 'Failed to revoke admin role');
      }

      return jsonResponse(corsHeaders, { success: true }, 200);
    }

    const { data, error } = await adminClient
      .from('admins')
      .update({ role: payload.role })
      .eq('id', payload.admin_id)
      .select('id, auth_user_id, role, created_at')
      .single();

    if (error) {
      return errorResponse(corsHeaders, 500, 'Failed to update admin role');
    }

    return jsonResponse(corsHeaders, { success: true, data }, 200);
  } catch {
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
