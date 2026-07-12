import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useBulkUpsertMembersMutation } from '@/hooks/domain/members/mutations/useBulkUpsertMembersMutation';
import { ADMIN_MEMBERS_IMPORT_SNAPSHOT_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersImportSnapshotQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersQuery';

const { mockBulkCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const caller = vi.fn();
  return {
    mockBulkCaller: caller,
    mockCreateEdgeFunctionCaller: vi.fn(() => caller),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  };
});

describe('useBulkUpsertMembersMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls edge function and invalidates member caches on success', async () => {
    mockBulkCaller.mockResolvedValueOnce({
      success: true,
      inserted_count: 2,
      updated_count: 1,
      imported_count: 3,
    });

    const { result, queryClient } = renderHookWithClient(() => useBulkUpsertMembersMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const response = await act(async () =>
      result.current.mutateAsync({
        rows: [
          {
            row_number: 2,
            member_id: 'RFID-1',
            first_name: 'John',
            last_name: 'Doe',
            nickname: 'JD',
            email: null,
            phone: null,
            date_of_birth: null,
            role: 'Prayer Coach',
            category: 'Adults',
            metadata: {},
          },
        ],
      }),
    );

    expect(response.success).toBe(true);
    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('bulk-upsert-members');
    expect(mockBulkCaller).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ADMIN_MEMBERS_IMPORT_SNAPSHOT_QUERY_KEY(),
      });
    });
  });
});
