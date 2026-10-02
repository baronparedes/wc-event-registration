import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../_shared/database.types.ts';

export async function resolveAllEmails(supabase: SupabaseClient<Database>): Promise<string[]> {
  const emailSet = new Set<string>();

  const { data: allUsers } = await supabase.from('users').select('email').not('email', 'is', null);

  allUsers?.forEach((u) => {
    const em = u.email?.trim().toLowerCase();
    if (em) emailSet.add(em);
  });

  return Array.from(emailSet);
}
