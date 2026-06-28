import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  }

  queryBuilder.select.mockReturnValue(queryBuilder)
  queryBuilder.eq.mockReturnValue(queryBuilder)

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
    supabase: {
      from: mockFrom,
    },
  }
})

import { useAdminEventQuery } from '@/hooks/domain/events/queries/useAdminEventQuery'

describe('useAdminEventQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns event data for a valid id', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'evt-1', title: 'Event One' },
      error: null,
    })

    const { result } = renderHookWithClient(() => useAdminEventQuery('evt-1'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({ id: 'evt-1', title: 'Event One' })
    expect(mockFrom).toHaveBeenCalledWith('events')
  })

  it('returns error state when query fails', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('not found'),
    })

    const { result } = renderHookWithClient(() => useAdminEventQuery('evt-missing'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('returns null when refetched without an id', async () => {
    const { result } = renderHookWithClient(() => useAdminEventQuery(undefined))

    const response = await result.current.refetch()

    expect(response.data).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
