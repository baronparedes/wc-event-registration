import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  type GoogleMemberSyncPreviewResult,
  type GoogleMemberSyncProgress,
  previewMembersFromGoogleSheet,
} from '@/lib/domain/members';

export const GOOGLE_SHEET_MEMBERS_PREVIEW_QUERY_KEY = () =>
  ['admin-members-google-sheet-preview'] as const;

/** Fetches a dry-run Google Sheet member sync preview with real-time streamed progress. */
export function useGoogleSheetMembersPreviewQuery(options: { enabled: boolean }) {
  const [progress, setProgress] = useState<GoogleMemberSyncProgress | null>(null);

  const query = useQuery<GoogleMemberSyncPreviewResult, Error>({
    queryKey: GOOGLE_SHEET_MEMBERS_PREVIEW_QUERY_KEY(),
    enabled: options.enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      setProgress({
        stage: 'fetching_sheet',
        message: 'Connecting to Google Sheets...',
        percent: 5,
      });

      return previewMembersFromGoogleSheet(
        (nextProgress) => {
          setProgress(nextProgress);
        },
        { signal },
      );
    },
  });

  return {
    ...query,
    progress,
  };
}
