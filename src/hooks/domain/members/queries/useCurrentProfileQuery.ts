import { useQuery } from '@tanstack/react-query';

import type { AdminMember } from '@/lib/domain/members';
import { supabase } from '@/lib/infrastructure';

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export const CURRENT_PROFILE_QUERY_KEY = ['current-profile'] as const;

/** Fetches the member record for the currently authenticated session based on email matching. */
export function useCurrentProfileQuery() {
  return useQuery({
    queryKey: CURRENT_PROFILE_QUERY_KEY,
    queryFn: async (): Promise<AdminMember | null> => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const userEmail = session?.user?.email;
      if (!userEmail) return null;

      const { data: member, error } = await supabase
        .from('users')
        .select(
          'id, member_id, avatar_object_key, is_active, full_name, first_name, last_name, nickname, email, phone, date_of_birth, role, category, metadata, created_at, updated_at',
        )
        .ilike('email', userEmail)
        .maybeSingle();

      if (error) throw error;
      if (!member) return null;

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
    },
    staleTime: 1000 * 60 * 5,
  });
}
