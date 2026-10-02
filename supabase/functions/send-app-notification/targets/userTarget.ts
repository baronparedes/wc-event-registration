import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../_shared/database.types.ts';

export async function resolveUserEmail(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data: userData } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  if (userData?.email) {
    return [userData.email.trim().toLowerCase()];
  }

  return [];
}
