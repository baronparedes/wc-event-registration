import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';
import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAdminMembersQuery } from '@/hooks/domain/members/queries/useAdminMembersQuery';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    or: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.range.mockReturnValue(queryBuilder);
  queryBuilder.or.mockReturnValue(queryBuilder);

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
    decodeOffsetCursor: vi.fn((cursor: string | null) => (cursor ? Number(cursor) : 0)),
    getTotalPages: vi.fn((totalCount: number, pageSize: number) =>
      Math.ceil(totalCount / pageSize),
    ),
    supabase: {
      from: mockFrom,
    },
  };
});

describe('useAdminMembersQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated members and transforms metadata role/category', async () => {
    const member = makeAdminMember({
      nickname: 'J',
      role: 'player',
      category: 'adult',
      phone: null,
      date_of_birth: null,
    });
    const dbRow = {
      id: member.id,
      member_id: member.member_id,
      full_name: member.full_name,
      first_name: member.first_name,
      last_name: member.last_name,
      nickname: member.nickname,
      email: member.email,
      phone: member.phone,
      date_of_birth: member.date_of_birth,
      metadata: { role: member.role, category: member.category },
      created_at: member.created_at,
      updated_at: member.updated_at,
    };
    mockQueryBuilder.or.mockResolvedValueOnce({
      data: [dbRow],
      error: null,
      count: 1,
    });

    const { result } = renderHookWithClient(() =>
      useAdminMembersQuery({ pageSize: 20, cursor: null, searchTerm: member.first_name ?? '' }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      items: [member],
      nextCursor: null,
      hasMore: false,
      totalCount: 1,
      totalPages: 1,
    });
    expect(mockQueryBuilder.or).toHaveBeenCalled();
  });

  it('returns error state when query fails', async () => {
    mockQueryBuilder.range.mockResolvedValueOnce({
      data: null,
      error: new Error('members failed'),
      count: null,
    });

    const { result } = renderHookWithClient(() => useAdminMembersQuery());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns empty page when no members are returned', async () => {
    mockQueryBuilder.range.mockResolvedValueOnce({
      data: [],
      error: null,
      count: 0,
    });

    const { result } = renderHookWithClient(() => useAdminMembersQuery({ pageSize: 10 }));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      items: [],
      nextCursor: null,
      hasMore: false,
      totalCount: 0,
      totalPages: 0,
    });
    expect(mockQueryBuilder.or).not.toHaveBeenCalled();
  });

  it('escapes search input and returns next cursor when more rows exist', async () => {
    mockQueryBuilder.or.mockResolvedValueOnce({
      data: [
        {
          id: 'user-9',
          member_id: 'WC-009',
          full_name: 'A_B,Name%Here',
          first_name: 'A_B',
          last_name: 'Name',
          nickname: null,
          email: null,
          phone: null,
          date_of_birth: null,
          metadata: { role: 123, category: false },
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
      count: 3,
    });

    const { result } = renderHookWithClient(() =>
      useAdminMembersQuery({ pageSize: 1, cursor: null, searchTerm: 'A_B,Name%Here' }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.or).toHaveBeenCalledWith(
      expect.stringContaining('A\\_B\\,Name\\%Here'),
    );
    expect(result.current.data?.items[0]?.role).toBe('');
    expect(result.current.data?.items[0]?.category).toBe('');
    expect(result.current.data?.hasMore).toBe(true);
    expect(result.current.data?.nextCursor).toBe('1');
    expect(result.current.data?.totalPages).toBe(3);
  });
});
