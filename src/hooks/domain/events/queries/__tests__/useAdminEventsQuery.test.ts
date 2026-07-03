import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { makeAdminEvent } from '@/__tests__/factories'

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
  }

  queryBuilder.select.mockReturnValue(queryBuilder)
  queryBuilder.or.mockReturnValue(queryBuilder)
  queryBuilder.order.mockReturnValue(queryBuilder)

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

import { useAdminEventsQuery } from '@/hooks/domain/events/queries/useAdminEventsQuery'

describe('useAdminEventsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns paginated admin events on success', async () => {
    const event = makeAdminEvent()
    const dbRow = { id: event.id, title: event.title }
    mockQueryBuilder.range.mockResolvedValueOnce({
      data: [dbRow],
      error: null,
      count: 11,
    })

    const { result } = renderHookWithClient(() =>
      useAdminEventsQuery({
        pageSize: 10,
        cursor: null,
      }),
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      items: [dbRow],
      hasMore: true,
      nextCursor: '10',
      totalCount: 11,
      totalPages: 2,
    })
    expect(mockFrom).toHaveBeenCalledWith('events')
  })

  it('returns query error state when supabase returns an error', async () => {
    mockQueryBuilder.range.mockResolvedValueOnce({
      data: null,
      error: new Error('events query failed'),
      count: null,
    })

    const { result } = renderHookWithClient(() => useAdminEventsQuery())

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('returns no next cursor when the current page exhausts total results', async () => {
    mockQueryBuilder.range.mockResolvedValueOnce({
      data: [
        {
          id: 'evt-2',
          title: 'Event Two',
        },
      ],
      error: null,
      count: 1,
    })

    const { result } = renderHookWithClient(() =>
      useAdminEventsQuery({
        pageSize: 10,
        cursor: null,
      }),
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      items: [{ id: 'evt-2', title: 'Event Two' }],
      hasMore: false,
      nextCursor: null,
      totalCount: 1,
      totalPages: 1,
    })
  })

  it('applies ilike filter when search term is provided', async () => {
    mockQueryBuilder.range.mockResolvedValueOnce({
      data: [],
      error: null,
      count: 0,
    })

    const { result } = renderHookWithClient(() =>
      useAdminEventsQuery({
        pageSize: 10,
        cursor: null,
        searchTerm: 'sample',
      }),
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockQueryBuilder.or).toHaveBeenCalledWith('title.ilike.%sample%,slug.ilike.%sample%')
  })
})
