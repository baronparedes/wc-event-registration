import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';
import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAdminMemberQuery } from '@/hooks/domain/members/queries/useAdminMemberQuery';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);

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

describe('useAdminMemberQuery', () => {
  let testMemberId: string;

  beforeEach(() => {
    // Generate stable ID once per test to ensure queryKey doesn't change
    testMemberId = faker.string.uuid();
    vi.clearAllMocks();
  });

  it('returns mapped member record', async () => {
    const member = makeAdminMember({
      nickname: 'J',
      role: 'player',
      category: 'adult',
      phone: null,
      date_of_birth: null,
    });
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: member.id,
        member_id: member.member_id,
        is_active: true,
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
      },
      error: null,
    });

    const { result } = renderHookWithClient(() => useAdminMemberQuery(member.id));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(member);
  });

  it('returns error state when member is not found', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useAdminMemberQuery(testMemberId));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns empty role/category when metadata values are not strings', async () => {
    const member = makeAdminMember({
      phone: null,
      date_of_birth: null,
      nickname: null,
      email: null,
    });
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: member.id,
        member_id: member.member_id,
        is_active: true,
        full_name: member.full_name,
        first_name: member.first_name,
        last_name: member.last_name,
        nickname: member.nickname,
        email: member.email,
        phone: member.phone,
        date_of_birth: member.date_of_birth,
        metadata: { role: 123, category: false },
        created_at: member.created_at,
        updated_at: member.updated_at,
      },
      error: null,
    });

    const { result } = renderHookWithClient(() => useAdminMemberQuery(member.id));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.role).toBe('');
    expect(result.current.data?.category).toBe('');
  });

  it('returns query error state when the users query fails', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('query failed'),
    });

    const { result } = renderHookWithClient(() => useAdminMemberQuery(testMemberId));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('stays idle when member ID is missing', () => {
    const { result } = renderHookWithClient(() => useAdminMemberQuery(undefined));

    expect(result.current.isPending).toBe(true);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns an error when refetch is called without member ID', async () => {
    const { result } = renderHookWithClient(() => useAdminMemberQuery(undefined));

    const response = await result.current.refetch();

    expect(response.error).toBeInstanceOf(Error);
    expect(response.error?.message).toBe('Member ID is required');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('does not filter by is_active when includeInactive is true', async () => {
    const member = makeAdminMember();
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: member.id,
        member_id: member.member_id,
        is_active: false,
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
      },
      error: null,
    });

    const { result } = renderHookWithClient(() =>
      useAdminMemberQuery(member.id, { includeInactive: true }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.eq).not.toHaveBeenCalledWith('is_active', true);
    expect(result.current.data?.is_active).toBe(false);
  });
});
