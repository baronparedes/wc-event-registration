import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../_shared/database.types.ts';
import { resolveAllEmails } from './allTarget.ts';
import { resolveEventEmails } from './eventTarget.ts';
import { resolveRoleEmails } from './roleTarget.ts';
import { resolveUserEmail } from './userTarget.ts';

export { resolveAllEmails } from './allTarget.ts';
export { resolveEventEmails } from './eventTarget.ts';
export { resolveRoleEmails } from './roleTarget.ts';
export { resolveUserEmail } from './userTarget.ts';

export interface ResolveTargetEmailsParams {
  supabase: SupabaseClient<Database>;
  targetType: 'all' | 'role' | 'user' | 'event';
  targetRoles?: string[] | null;
  targetUserId?: string | null;
  targetEventId?: string | null;
}

export async function resolveTargetEmails({
  supabase,
  targetType,
  targetRoles,
  targetUserId,
  targetEventId,
}: ResolveTargetEmailsParams): Promise<string[]> {
  switch (targetType) {
    case 'event':
      if (!targetEventId) return [];
      return await resolveEventEmails(supabase, targetEventId);

    case 'all':
      return await resolveAllEmails(supabase);

    case 'role':
      if (!targetRoles || targetRoles.length === 0) return [];
      return await resolveRoleEmails(supabase, targetRoles);

    case 'user':
      if (!targetUserId) return [];
      return await resolveUserEmail(supabase, targetUserId);

    default:
      return [];
  }
}
