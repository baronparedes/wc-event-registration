import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../_shared/database.types.ts';

export async function resolveRoleEmails(
  supabase: SupabaseClient<Database>,
  roles: string[],
): Promise<string[]> {
  const emailSet = new Set<string>();

  // 1. Members matching role
  const { data: memberRows } = await supabase
    .from('users')
    .select('email, role')
    .not('email', 'is', null);

  memberRows?.forEach((u) => {
    if (!u.email || !u.role) return;
    const matches = roles.some((role) => u.role?.toLowerCase().includes(role.toLowerCase()));
    if (matches) {
      emailSet.add(u.email.trim().toLowerCase());
    }
  });

  // 2. Admins matching role
  const { data: adminRows } = await supabase
    .from('admins')
    .select('auth_user_id')
    .in('role', roles);

  if (adminRows && adminRows.length > 0) {
    const adminIds = adminRows.map((a) => a.auth_user_id);
    const { data: authUsers } = await supabase.from('users').select('email').in('id', adminIds);

    authUsers?.forEach((au) => {
      const em = au.email?.trim().toLowerCase();
      if (em) emailSet.add(em);
    });
  }

  return Array.from(emailSet);
}
