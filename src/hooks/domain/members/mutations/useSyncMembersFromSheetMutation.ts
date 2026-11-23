import { useCallback, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type GoogleMemberSyncProgress,
  type GoogleMemberSyncResult,
  syncMembersFromGoogleSheet,
} from '@/lib/domain/members';

import { ADMIN_MEMBERS_IMPORT_SNAPSHOT_QUERY_KEY } from '../queries/useAdminMembersImportSnapshotQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '../queries/useAdminMembersQuery';

/** Triggers manual Google Sheet member sync with real-time streamed backend progress. */
export function useSyncMembersFromSheetMutation() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<GoogleMemberSyncProgress | null>(null);

  const mutation = useMutation({
    mutationFn: async (): Promise<GoogleMemberSyncResult> => {
      setProgress({
        stage: 'fetching_sheet',
        message: 'Connecting to Google Sheets...',
        percent: 5,
      });

      return syncMembersFromGoogleSheet((nextProgress) => {
        setProgress(nextProgress);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_IMPORT_SNAPSHOT_QUERY_KEY() });
    },
  });

  const resetSync = useCallback(() => {
    setProgress(null);
    mutation.reset();
  }, [mutation]);

  return {
    ...mutation,
    progress,
    resetSync,
  };
}
