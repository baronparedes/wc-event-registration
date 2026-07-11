import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type MemberCsvPreparedRowInput } from '@/lib/domain/members';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import { ADMIN_MEMBERS_IMPORT_SNAPSHOT_QUERY_KEY } from '../queries/useAdminMembersImportSnapshotQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '../queries/useAdminMembersQuery';

export interface BulkUpsertMembersInput {
  rows: MemberCsvPreparedRowInput[];
}

export interface BulkUpsertMembersResponse {
  success: boolean;
  inserted_count: number;
  updated_count: number;
  imported_count: number;
  error?: string;
  details?: string[];
}

/** Executes atomic member CSV upsert through admin Edge Function. */
export function useBulkUpsertMembersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BulkUpsertMembersInput): Promise<BulkUpsertMembersResponse> => {
      const caller = createEdgeFunctionCaller<BulkUpsertMembersInput, BulkUpsertMembersResponse>(
        'bulk-upsert-members',
      );
      return caller(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_IMPORT_SNAPSHOT_QUERY_KEY() });
    },
  });
}
