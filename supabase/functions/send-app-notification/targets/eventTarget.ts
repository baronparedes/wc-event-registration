import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/database.types.ts';

export async function resolveEventEmails(
  supabase: SupabaseClient<Database>,
  eventId: string,
): Promise<string[]> {
  const emailSet = new Set<string>();

  // 1. Query registered members for this event
  const { data: regMembers } = await supabase
    .from('registrations')
    .select('users!inner(email)')
    .eq('event_id', eventId)
    .neq('status', 'cancelled');

  regMembers?.forEach((r) => {
    const em = (r.users as { email?: string | null } | null)?.email?.trim().toLowerCase();
    if (em) emailSet.add(em);
  });

  // 2. Query public registrants for this event
  const { data: pubMembers } = await supabase
    .from('public_registrations')
    .select('email')
    .eq('event_id', eventId)
    .neq('status', 'cancelled');

  pubMembers?.forEach((pr) => {
    const em = pr.email?.trim().toLowerCase();
    if (em) emailSet.add(em);
  });

  return Array.from(emailSet);
}
