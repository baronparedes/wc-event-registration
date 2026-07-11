import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAdminMembersImportSnapshotQuery } from '@/hooks/domain/members/queries/useAdminMembersImportSnapshotQuery';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    order: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);

  return {
    mockQueryBuilder: queryBuilder,
    mockFrom: vi.fn(() => queryBuilder),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    supabase: {
      from: mockFrom,
    },
  };
});

describe('useAdminMembersImportSnapshotQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns normalized snapshot rows', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({
      data: [
        {
          id: 'member-1',
          member_id: 'RFID-1',
          first_name: null,
          last_name: 'Doe',
          nickname: null,
          is_active: true,
        },
      ],
      error: null,
    });

    const { result } = renderHookWithClient(() => useAdminMembersImportSnapshotQuery());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([
      {
        id: 'member-1',
        member_id: 'RFID-1',
        first_name: '',
        last_name: 'Doe',
        nickname: '',
        is_active: true,
      },
    ]);
  });

  it('returns error state when query fails', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({
      data: null,
      error: new Error('snapshot failed'),
    });

    const { result } = renderHookWithClient(() => useAdminMembersImportSnapshotQuery());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
