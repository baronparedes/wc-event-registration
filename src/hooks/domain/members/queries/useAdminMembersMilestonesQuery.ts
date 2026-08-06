import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { AdminMember } from '@/lib/domain/members';
import { supabase } from '@/lib/infrastructure';

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Fetches active members for the milestone calendar view.
 */
export function useAdminMembersMilestonesQuery() {
  return useQuery({
    queryKey: ['admin-members-milestones'] as const,
    queryFn: async (): Promise<AdminMember[]> => {
      const { data: members, error } = await supabase
        .from('users')
        .select(
          'id, member_id, avatar_object_key, is_active, full_name, first_name, last_name, nickname, email, phone, date_of_birth, role, category, metadata, created_at, updated_at',
        )
        .eq('is_active', true)
        .order('full_name', { ascending: true })
        .order('member_id', { ascending: true });

      if (error) throw error;

      return (members ?? []).map((member) => {
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
        } satisfies AdminMember;
      });
    },
    staleTime: QUERY_STALE_TIME_MS.oneDay,
  });
}
