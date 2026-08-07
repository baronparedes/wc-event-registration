import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAdminMembersMilestonesQuery } from '@/hooks/domain/members/queries/useAdminMembersMilestonesQuery';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);
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

describe('useAdminMembersMilestonesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns normalized milestone members and keeps only string metadata values', async () => {
    mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: [
        {
          id: 'member-1',
          member_id: 'WC-001',
          avatar_object_key: 123,
          is_active: true,
          full_name: 'Jane Doe',
          first_name: 'Jane',
          last_name: 'Doe',
          nickname: null,
          email: null,
          phone: null,
          date_of_birth: '1990-06-15',
          role: 42,
          category: false,
          metadata: { tag: 'vip', wedanniv_date: '2001-06-10', age: 99 },
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    });

    const { result } = renderHookWithClient(() => useAdminMembersMilestonesQuery());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_active', true);
    expect(result.current.data).toEqual([
      {
        id: 'member-1',
        member_id: 'WC-001',
        avatar_object_key: null,
        is_active: true,
        full_name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        nickname: null,
        email: null,
        phone: null,
        date_of_birth: '1990-06-15',
        role: '',
        category: '',
        extra_metadata: { tag: 'vip', wedanniv_date: '2001-06-10' },
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('returns an empty list when no members are returned', async () => {
    mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHookWithClient(() => useAdminMembersMilestonesQuery());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('returns error state when supabase returns an error', async () => {
    mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: new Error('milestones failed'),
    });

    const { result } = renderHookWithClient(() => useAdminMembersMilestonesQuery());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
