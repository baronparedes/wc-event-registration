import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/database.types.ts';

export async function resolveUserEmail(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  // 1. Try resolving via auth.admin (when userId is an auth.users ID from user picker)
  try {
    const { data: authUserData, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (!authError && authUserData?.user?.email) {
      return [authUserData.user.email.trim().toLowerCase()];
    }
  } catch {
    // Ignore auth.admin error and fallback
  }

  // 2. Fallback to querying public.users table (in case userId is a member record ID)
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
