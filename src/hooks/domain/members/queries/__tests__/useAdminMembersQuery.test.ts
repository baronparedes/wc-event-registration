import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    or: vi.fn(),
  }

  queryBuilder.select.mockReturnValue(queryBuilder)
  queryBuilder.order.mockReturnValue(queryBuilder)
  queryBuilder.range.mockReturnValue(queryBuilder)
  queryBuilder.or.mockReturnValue(queryBuilder)

  return {
    mockQueryBuilder: queryBuilder,
    mockFrom: vi.fn(() => queryBuilder),
  }
})

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')

  return {
    ...actual,
    decodeOffsetCursor: vi.fn((cursor: string | null) => (cursor ? Number(cursor) : 0)),
    getTotalPages: vi.fn((totalCount: number, pageSize: number) =>
      Math.ceil(totalCount / pageSize),
    ),
    supabase: {
      from: mockFrom,
    },
  }
})

import { useAdminMembersQuery } from '@/hooks/domain/members/queries/useAdminMembersQuery'

describe('useAdminMembersQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns paginated members and transforms metadata role/category', async () => {
    mockQueryBuilder.or.mockResolvedValueOnce({
      data: [
        {
          id: 'user-1',
          member_id: 'WC-001',
          full_name: 'Jane Doe',
          first_name: 'Jane',
          last_name: 'Doe',
          nickname: 'J',
          email: 'jane@example.com',
          phone: null,
          date_of_birth: null,
          metadata: { role: 'player', category: 'adult' },
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
      count: 1,
    })

    const { result } = renderHookWithClient(() =>
      useAdminMembersQuery({ pageSize: 20, cursor: null, searchTerm: 'Jane' }),
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      items: [
        {
          id: 'user-1',
          member_id: 'WC-001',
          full_name: 'Jane Doe',
          first_name: 'Jane',
          last_name: 'Doe',
          nickname: 'J',
          email: 'jane@example.com',
          phone: null,
          date_of_birth: null,
          role: 'player',
          category: 'adult',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      nextCursor: null,
      hasMore: false,
      totalCount: 1,
      totalPages: 1,
    })
    expect(mockQueryBuilder.or).toHaveBeenCalled()
  })

  it('returns error state when query fails', async () => {
    mockQueryBuilder.range.mockResolvedValueOnce({
      data: null,
      error: new Error('members failed'),
      count: null,
    })

    const { result } = renderHookWithClient(() => useAdminMembersQuery())

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })
})
