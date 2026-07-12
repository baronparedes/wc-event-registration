import { useQuery } from '@tanstack/react-query';

import type { AdminMember } from '@/lib/domain/members';
import { supabase } from '@/lib/infrastructure';

type UserMetadata = Record<string, unknown>;

const CORE_METADATA_KEYS = new Set(['role', 'category']);

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

      let query = supabase
        .from('users')
        .select(
          'id, member_id, is_active, full_name, first_name, last_name, nickname, email, phone, date_of_birth, metadata, created_at, updated_at',
        )
        .eq('id', memberId);

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data: member, error } = await query.maybeSingle();

      if (error) throw error;
      if (!member) throw new Error('Member not found');

      const metadata = (member.metadata as UserMetadata | null | undefined) ?? {};

      const extra_metadata: Record<string, string> = {};
      for (const [key, value] of Object.entries(metadata)) {
        if (!CORE_METADATA_KEYS.has(key) && typeof value === 'string') {
          extra_metadata[key] = value;
        }
      }

      return {
        id: member.id,
        member_id: member.member_id,
        is_active: member.is_active,
        full_name: member.full_name,
        first_name: member.first_name,
        last_name: member.last_name,
        nickname: member.nickname,
        email: member.email,
        phone: member.phone,
        date_of_birth: member.date_of_birth,
        role: readMetadataString(metadata['role']),
        category: readMetadataString(metadata['category']),
        extra_metadata,
        created_at: member.created_at,
        updated_at: member.updated_at,
      } satisfies AdminMember;
    },
    staleTime: 0,
  });
}
