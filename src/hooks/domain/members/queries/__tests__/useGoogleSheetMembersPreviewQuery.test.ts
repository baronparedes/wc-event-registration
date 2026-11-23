import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useGoogleSheetMembersPreviewQuery } from '@/hooks/domain/members/queries/useGoogleSheetMembersPreviewQuery';
import { previewMembersFromGoogleSheet } from '@/lib/domain/members';

vi.mock('@/lib/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/domain/members')>('@/lib/domain/members');
  return {
    ...actual,
    previewMembersFromGoogleSheet: vi.fn(),
  };
});

describe('useGoogleSheetMembersPreviewQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches dry-run preview and updates streamed progress when enabled', async () => {
    vi.mocked(previewMembersFromGoogleSheet).mockImplementationOnce(async (onProgress) => {
      onProgress({
        stage: 'resolving_rows',
        message: 'Comparing rows...',
        percent: 90,
      });
      return {
        dry_run: true,
        total_sheet_rows: 3,
        skipped_count: 0,
        summary: {
          total_rows: 3,
          insert_count: 1,
          update_count: 1,
          update_member_id_count: 0,
          unchanged_count: 1,
          error_count: 0,
        },
        preview_rows: [],
        errors: [],
        skipped_rows: [],
        timestamp: '2026-11-23T05:00:00.000Z',
      };
    });

    const { result } = renderHookWithClient(() =>
      useGoogleSheetMembersPreviewQuery({ enabled: true }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.summary.insert_count).toBe(1);
    expect(result.current.progress).toEqual(
      expect.objectContaining({
        stage: 'resolving_rows',
        percent: 90,
      }),
    );
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHookWithClient(() =>
      useGoogleSheetMembersPreviewQuery({ enabled: false }),
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(previewMembersFromGoogleSheet).not.toHaveBeenCalled();
  });
});
