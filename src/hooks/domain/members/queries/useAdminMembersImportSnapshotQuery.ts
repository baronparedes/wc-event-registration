import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { supabase } from '@/lib/infrastructure';

export interface AdminMembersImportSnapshotMember {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  is_active: boolean;
}

export const ADMIN_MEMBERS_IMPORT_SNAPSHOT_QUERY_KEY = () =>
  ['admin-members-import-snapshot'] as const;

/** Fetches full member identity snapshot used for CSV import preview classification. */
export function useAdminMembersImportSnapshotQuery() {
  return useQuery({
    queryKey: ADMIN_MEMBERS_IMPORT_SNAPSHOT_QUERY_KEY(),
    queryFn: async (): Promise<AdminMembersImportSnapshotMember[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, member_id, first_name, last_name, nickname, is_active')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map((member) => ({
        id: member.id,
        member_id: member.member_id ?? '',
        first_name: member.first_name ?? '',
        last_name: member.last_name ?? '',
        nickname: member.nickname ?? '',
        is_active: member.is_active,
      }));
    },
    staleTime: QUERY_STALE_TIME_MS.immediate,
  });
}
