import { supabase } from '@/lib/infrastructure';

import type { AdminAuditPayload } from './types';

async function getCurrentAdminId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const { data: adminRow, error } = await supabase
    .from('admins')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return adminRow?.id ?? null;
}

export async function writeAdminAuditLog(payload: AdminAuditPayload): Promise<void> {
  const adminId = await getCurrentAdminId();
  if (!adminId) {
    return;
  }

  const { error } = await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action: payload.action,
    resource_type: payload.resourceType,
    resource_id: payload.resourceId ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    throw error;
  }
}

export async function writeAdminAuditLogSafely(payload: AdminAuditPayload): Promise<void> {
  try {
    await writeAdminAuditLog(payload);
  } catch (error) {
    console.error('[audit-log] failed to write audit event', {
      action: payload.action,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      error,
    });
  }
}
