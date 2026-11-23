import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useSyncMembersFromSheetMutation } from '@/hooks/domain/members/mutations/useSyncMembersFromSheetMutation';
import { ADMIN_MEMBERS_IMPORT_SNAPSHOT_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersImportSnapshotQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersQuery';
import { syncMembersFromGoogleSheet } from '@/lib/domain/members';

vi.mock('@/lib/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/domain/members')>('@/lib/domain/members');
  return {
    ...actual,
    syncMembersFromGoogleSheet: vi.fn(),
  };
});

describe('useSyncMembersFromSheetMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('streams progress, returns final sync result, invalidates queries, and resets state', async () => {
    vi.mocked(syncMembersFromGoogleSheet).mockImplementationOnce(async (onProgress) => {
      onProgress({
        stage: 'upserting_batches',
        message: 'Upserting members (batch 1 of 1)...',
        percent: 80,
        total_sheet_rows: 10,
      });
      return {
        inserted_count: 2,
        updated_count: 8,
        skipped_count: 0,
        total_sheet_rows: 10,
        errors: [],
        skipped_rows: [],
        timestamp: '2026-11-23T05:00:00.000Z',
      };
    });

    const { result, queryClient } = renderHookWithClient(() => useSyncMembersFromSheetMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const syncResult = await act(async () => result.current.mutateAsync());

    expect(syncResult.inserted_count).toBe(2);
    expect(syncResult.updated_count).toBe(8);
    expect(result.current.progress).toEqual(
      expect.objectContaining({
        stage: 'upserting_batches',
        percent: 80,
      }),
    );

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ADMIN_MEMBERS_IMPORT_SNAPSHOT_QUERY_KEY(),
      });
    });

    act(() => {
      result.current.resetSync();
    });

    expect(result.current.progress).toBeNull();
  });
});
