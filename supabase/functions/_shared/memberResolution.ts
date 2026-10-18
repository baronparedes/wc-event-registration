import type { SupabaseClient } from '@supabase/supabase-js';

import { decodeMemberLookupToken } from './memberLookupToken.ts';

export interface ResolveMemberOptions {
  member_token?: string | null;
  member_id?: string | null;
  user_id?: string | null;
  authUserId?: string | null;
}

export interface ResolvedMemberUser {
  userId: string;
  memberId: string;
  fullName: string | null;
  email: string | null;
}

export type ResolveMemberResult =
  | { success: true; user: ResolvedMemberUser }
  | { success: false; error: string; errorCode: string; status: number };

/**
 * Standardized member account resolution supporting member_token, authUserId,
 * member_id (plain or tokenized), and user_id.
 */
export async function resolveMemberUser(
  supabase: SupabaseClient,
  options: ResolveMemberOptions,
): Promise<ResolveMemberResult> {
  const { member_token, member_id, user_id, authUserId } = options;

  let lookupField: 'id' | 'member_id' | null = null;
  let lookupValue: string | null = null;

  if (member_token) {
    const decoded = await decodeMemberLookupToken(member_token);
    if (!decoded?.memberId) {
      return {
        success: false,
        error: 'Invalid or expired member token. Please look up your member ID again.',
        errorCode: 'INVALID_TOKEN',
        status: 400,
      };
    }
    lookupField = 'member_id';
    lookupValue = decoded.memberId;
  } else if (authUserId) {
    lookupField = 'id';
    lookupValue = authUserId;
  } else if (member_id) {
    let resolvedId = member_id;
    if (member_id.startsWith('mlt2.')) {
      const decoded = await decodeMemberLookupToken(member_id);
      if (!decoded?.memberId) {
        return {
          success: false,
          error: 'Invalid or expired member token',
          errorCode: 'INVALID_TOKEN',
          status: 400,
        };
      }
      resolvedId = decoded.memberId;
    }
    lookupField = 'member_id';
    lookupValue = resolvedId;
  } else if (user_id) {
    lookupField = 'id';
    lookupValue = user_id;
  }

  if (!lookupField || !lookupValue) {
    return {
      success: false,
      error: 'Unable to resolve member account',
      errorCode: 'MEMBER_RESOLUTION_FAILED',
      status: 400,
    };
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, member_id, is_active, full_name, email')
    .eq(lookupField, lookupValue)
    .maybeSingle();

  if (userError || !user || !user.is_active) {
    return {
      success: false,
      error: 'Member account not found or inactive',
      errorCode: 'MEMBER_NOT_FOUND',
      status: 404,
    };
  }

  return {
    success: true,
    user: {
      userId: user.id,
      memberId: user.member_id,
      fullName: user.full_name,
      email: user.email,
    },
  };
}
