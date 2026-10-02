import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/database.types.ts';

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
    for (const admin of adminRows) {
      if (admin.auth_user_id) {
        try {
          const { data: authUserData, error: authError } = await supabase.auth.admin.getUserById(
            admin.auth_user_id,
          );
          if (!authError && authUserData?.user?.email) {
            emailSet.add(authUserData.user.email.trim().toLowerCase());
          }
        } catch {
          // Ignore auth.admin error
        }
      }
    }
  }

  return Array.from(emailSet);
}
