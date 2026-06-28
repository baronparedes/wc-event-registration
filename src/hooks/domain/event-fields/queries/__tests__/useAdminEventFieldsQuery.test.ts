import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
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

import { useAdminEventFieldsQuery } from '@/hooks/domain/event-fields/queries/useAdminEventFieldsQuery'

describe('useAdminEventFieldsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ordered event fields for an event', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({
      data: [{ id: 'field-1', event_id: 'event-1', field_key: 'team_name' }],
      error: null,
    })

    const { result } = renderHookWithClient(() => useAdminEventFieldsQuery('event-1'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([
      { id: 'field-1', event_id: 'event-1', field_key: 'team_name' },
    ])
  })

  it('returns query error state when field query fails', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({ data: null, error: new Error('fields failed') })

    const { result } = renderHookWithClient(() => useAdminEventFieldsQuery('event-1'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('returns empty array when database returns null data without error', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHookWithClient(() => useAdminEventFieldsQuery('event-1'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('stays idle when event ID is missing', () => {
    const { result } = renderHookWithClient(() => useAdminEventFieldsQuery(undefined))

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.isSuccess).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
