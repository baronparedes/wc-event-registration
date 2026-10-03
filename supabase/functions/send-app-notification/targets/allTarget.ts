import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/database.types.ts';

export async function resolveAllEmails(supabase: SupabaseClient<Database>): Promise<string[]> {
  const emailSet = new Set<string>();

  // 1. Registered member emails
  const { data: allUsers, error: usersError } = await supabase
    .from('users')
    .select('email')
    .not('email', 'is', null);

  if (usersError) {
    console.error('[resolveAllEmails] Failed to query public.users:', usersError);
  }

  allUsers?.forEach((u) => {
    const em = u.email?.trim().toLowerCase();
    if (em) emailSet.add(em);
  });

  // 2. Auth user accounts (e.g. admins, registered accounts)
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authError) {
      console.warn('[resolveAllEmails] Failed to query auth.admin.listUsers:', authError);
    } else {
      authData?.users?.forEach((u) => {
        const em = u.email?.trim().toLowerCase();
        if (em) emailSet.add(em);
      });
    }
  } catch (err) {
    console.warn('[resolveAllEmails] auth.admin.listUsers error:', err);
  }

  return Array.from(emailSet);
}
