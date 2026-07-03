import { useQuery } from '@tanstack/react-query';

import type { AdminMember } from '@/lib/domain/members';
import { supabase } from '@/lib/infrastructure';

type UserMetadata = {
  role?: unknown;
  category?: unknown;
};

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export const ADMIN_MEMBER_QUERY_KEY = (memberId: string) => ['admin-member', memberId] as const;

/** Fetches a single member record for the admin edit page. */
export function useAdminMemberQuery(memberId: string | undefined) {
  return useQuery({
    queryKey: memberId ? ADMIN_MEMBER_QUERY_KEY(memberId) : ['admin-member', 'missing'],
    enabled: Boolean(memberId),
    queryFn: async (): Promise<AdminMember> => {
      if (!memberId) {
        throw new Error('Member ID is required');
      }

      const { data: member, error } = await supabase
        .from('users')
        .select(
          'id, member_id, full_name, first_name, last_name, nickname, email, phone, date_of_birth, metadata, created_at, updated_at',
        )
        .eq('id', memberId)
        .maybeSingle();

      if (error) throw error;
      if (!member) throw new Error('Member not found');

      const metadata = (member.metadata as UserMetadata | null | undefined) ?? null;

      return {
        id: member.id,
        member_id: member.member_id,
        full_name: member.full_name,
        first_name: member.first_name,
        last_name: member.last_name,
        nickname: member.nickname,
        email: member.email,
        phone: member.phone,
        date_of_birth: member.date_of_birth,
        role: readMetadataString(metadata?.role),
        category: readMetadataString(metadata?.category),
        created_at: member.created_at,
        updated_at: member.updated_at,
      } satisfies AdminMember;
    },
    staleTime: 0,
  });
}
