import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';
import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useCurrentProfileQuery } from '@/hooks/domain/members/queries/useCurrentProfileQuery';

const { mockQueryBuilder, mockFrom, mockGetSession } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    ilike: vi.fn(),
    maybeSingle: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.ilike.mockReturnValue(queryBuilder);

  return {
    mockQueryBuilder: queryBuilder,
    mockFrom: vi.fn(() => queryBuilder),
    mockGetSession: vi.fn(),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    supabase: {
      auth: {
        getSession: mockGetSession,
      },
      from: mockFrom,
    },
  };
});

describe('useCurrentProfileQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when there is no active auth session', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const { result } = renderHookWithClient(() => useCurrentProfileQuery());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns mapped member profile when session email matches a member', async () => {
    const userEmail = faker.internet.email();
    const member = makeAdminMember({
      email: userEmail,
      nickname: 'Alex',
      role: 'player',
      category: 'adult',
    });

    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { email: userEmail },
        },
      },
      error: null,
    });

    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
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
        metadata: { club: 'North' },
        created_at: member.created_at,
        updated_at: member.updated_at,
      },
      error: null,
    });

    const { result } = renderHookWithClient(() => useCurrentProfileQuery());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      ...member,
      extra_metadata: { club: 'North' },
    });
    expect(mockQueryBuilder.ilike).toHaveBeenCalledWith('email', userEmail);
  });

  it('returns null when session email has no matching user record', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { email: 'unknown@example.com' },
        },
      },
      error: null,
    });

    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHookWithClient(() => useCurrentProfileQuery());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it('returns query error state when getSession throws error', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('Session fetch failed'),
    });

    const { result } = renderHookWithClient(() => useCurrentProfileQuery());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
