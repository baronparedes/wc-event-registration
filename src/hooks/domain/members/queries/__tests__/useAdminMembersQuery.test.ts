import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';
import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAdminMembersQuery } from '@/hooks/domain/members/queries/useAdminMembersQuery';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    or: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);
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

  it('returns paginated members and reads role/category from user columns', async () => {
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
      avatar_object_key: member.avatar_object_key,
      is_active: true,
      full_name: member.full_name,
      first_name: member.first_name,
      last_name: member.last_name,
      nickname: member.nickname,
      email: member.email,
      phone: member.phone,
      date_of_birth: member.date_of_birth,
      role: member.role,
      category: member.category,
      metadata: {},
      created_at: member.created_at,
      updated_at: member.updated_at,
    };
    mockQueryBuilder.or.mockResolvedValueOnce({
      data: [dbRow],
      error: null,
      count: 1,
    });

    const { result } = renderHookWithClient(() =>
      useAdminMembersQuery({ pageSize: 20, searchTerm: member.first_name ?? '' }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages[0]).toEqual({
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

    expect(result.current.data?.pages[0]).toEqual({
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
          avatar_object_key: null,
          is_active: true,
          full_name: 'A_B,Name%Here',
          first_name: 'A_B',
          last_name: 'Name',
          nickname: null,
          email: null,
          phone: null,
          date_of_birth: null,
          role: 123,
          category: false,
          metadata: {},
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
      count: 3,
    });

    const { result } = renderHookWithClient(() =>
      useAdminMembersQuery({ pageSize: 1, searchTerm: 'A_B,Name%Here' }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.or).toHaveBeenCalledWith(
      expect.stringContaining('A\\_B\\,Name\\%Here'),
    );
    expect(result.current.data?.pages[0]?.items[0]?.role).toBe('');
    expect(result.current.data?.pages[0]?.items[0]?.category).toBe('');
    expect(result.current.data?.pages[0]?.hasMore).toBe(true);
    expect(result.current.data?.pages[0]?.nextCursor).toBe('1');
    expect(result.current.data?.pages[0]?.totalPages).toBe(3);
  });

  it('applies deleted status filter when requested', async () => {
    mockQueryBuilder.range.mockResolvedValueOnce({
      data: [],
      error: null,
      count: 0,
    });

    const { result } = renderHookWithClient(() =>
      useAdminMembersQuery({ pageSize: 10, statusFilter: 'deleted' }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_active', false);
  });

  it('does not apply is_active filter when status filter is all', async () => {
    mockQueryBuilder.range.mockResolvedValueOnce({
      data: [],
      error: null,
      count: 0,
    });

    const { result } = renderHookWithClient(() =>
      useAdminMembersQuery({ pageSize: 10, statusFilter: 'all' }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.eq).not.toHaveBeenCalledWith('is_active', true);
    expect(mockQueryBuilder.eq).not.toHaveBeenCalledWith('is_active', false);
  });

  it('excludes non-string extra metadata values from extra_metadata in list results', async () => {
    mockQueryBuilder.range.mockResolvedValueOnce({
      data: [
        {
          id: 'user-1',
          member_id: 'WC-001',
          avatar_object_key: null,
          is_active: true,
          full_name: 'Jane Doe',
          first_name: 'Jane',
          last_name: 'Doe',
          nickname: null,
          email: null,
          phone: null,
          date_of_birth: null,
          role: 'player',
          category: 'adult',
          metadata: { tag: 'vip', count: 5 },
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
      count: 1,
    });

    const { result } = renderHookWithClient(() => useAdminMembersQuery({ pageSize: 10 }));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages[0]?.items[0]?.extra_metadata).toEqual({ tag: 'vip' });
  });

  it.each([
    ['first name', 'John', 'first_name.ilike.%John%'],
    ['last name', 'Smith', 'last_name.ilike.%Smith%'],
    ['nickname', 'Johnny', 'nickname.ilike.%Johnny%'],
    ['member ID', 'WC-002', 'member_id.ilike.%WC-002%'],
    ['email', 'john.smith@email.com', 'email.ilike.%john.smith@email.com%'],
    ['multiple name or email tokens', 'John Smith', 'full_name.ilike.%John%Smith%'],
  ])('filters by %s', async (_field, searchTerm, expectedFilter) => {
    mockQueryBuilder.or.mockResolvedValueOnce({
      data: [
        {
          id: 'user-2',
          member_id: 'WC-002',
          avatar_object_key: null,
          is_active: true,
          full_name: 'John Smith',
          first_name: 'John',
          last_name: 'Smith',
          nickname: null,
          email: 'john.smith@email.com',
          phone: null,
          date_of_birth: null,
          role: 'player',
          category: 'adult',
          metadata: {},
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
      count: 1,
    });

    const { result } = renderHookWithClient(() =>
      useAdminMembersQuery({ pageSize: 10, searchTerm }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.or).toHaveBeenCalledWith(expect.stringContaining(expectedFilter));
  });

  it('populates last_activity from user query columns', async () => {
    const member1 = makeAdminMember({ id: 'user-1' });
    const member2 = makeAdminMember({ id: 'user-2' });

    mockQueryBuilder.range.mockResolvedValueOnce({
      data: [
        {
          id: member1.id,
          member_id: member1.member_id,
          avatar_object_key: null,
          is_active: true,
          full_name: member1.full_name,
          first_name: member1.first_name,
          last_name: member1.last_name,
          nickname: member1.nickname,
          email: member1.email,
          phone: member1.phone,
          date_of_birth: member1.date_of_birth,
          role: member1.role,
          category: member1.category,
          metadata: {},
          created_at: member1.created_at,
          updated_at: member1.updated_at,
          last_activity: '2026-09-20T10:00:00Z',
        },
        {
          id: member2.id,
          member_id: member2.member_id,
          avatar_object_key: null,
          is_active: true,
          full_name: member2.full_name,
          first_name: member2.first_name,
          last_name: member2.last_name,
          nickname: member2.nickname,
          email: member2.email,
          phone: member2.phone,
          date_of_birth: member2.date_of_birth,
          role: member2.role,
          category: member2.category,
          metadata: {},
          created_at: member2.created_at,
          updated_at: member2.updated_at,
          last_activity: null,
        },
      ],
      error: null,
      count: 2,
    });

    const { result } = renderHookWithClient(() => useAdminMembersQuery({ pageSize: 10 }));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages[0]?.items[0]?.last_activity).toBe('2026-09-20T10:00:00Z');
    expect(result.current.data?.pages[0]?.items[1]?.last_activity).toBeUndefined();
  });
});
