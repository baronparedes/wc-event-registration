import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import {
  type AdminMember,
  fetchAdminMemberById,
  fetchMemberLatestServiceAttendance,
} from '@/lib/domain/members';

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export const ADMIN_MEMBER_QUERY_KEY = (memberId: string) => ['admin-member', memberId] as const;

export const adminMemberQueryKey = (memberId: string, includeInactive: boolean) =>
  ['admin-member', memberId, includeInactive] as const;

/** Fetches a single member record for the admin edit page. */
export function useAdminMemberQuery(
  memberId: string | undefined,
  options?: { includeInactive?: boolean },
) {
  const includeInactive = options?.includeInactive ?? false;

  return useQuery({
    queryKey: memberId
      ? adminMemberQueryKey(memberId, includeInactive)
      : ['admin-member', 'missing'],
    enabled: Boolean(memberId),
    queryFn: async (): Promise<AdminMember> => {
      if (!memberId) {
        throw new Error('Member ID is required');
      }

      const member = await fetchAdminMemberById(memberId, includeInactive);

      if (!member) throw new Error('Member not found');

      // Fetch the single most recent service attendance record to calculate last_activity
      const latestAttendance = await fetchMemberLatestServiceAttendance(member.id);

      const last_activity = latestAttendance?.checked_in_at;

      const metadata = (member.metadata as Record<string, unknown> | null | undefined) ?? {};

      const extra_metadata: Record<string, string> = {};
      for (const [key, value] of Object.entries(metadata)) {
        if (typeof value === 'string') {
          extra_metadata[key] = value;
        }
      }

      return {
        id: member.id,
        member_id: member.member_id,
        avatar_object_key:
          typeof member.avatar_object_key === 'string' ? member.avatar_object_key : null,
        is_active: member.is_active,
        full_name: member.full_name,
        first_name: member.first_name,
        last_name: member.last_name,
        nickname: member.nickname,
        email: member.email,
        phone: member.phone,
        date_of_birth: member.date_of_birth,
        role: readMetadataString(member.role),
        category: readMetadataString(member.category),
        extra_metadata,
        created_at: member.created_at,
        updated_at: member.updated_at,
        last_activity,
      } satisfies AdminMember;
    },
    staleTime: QUERY_STALE_TIME_MS.detail,
  });
}
