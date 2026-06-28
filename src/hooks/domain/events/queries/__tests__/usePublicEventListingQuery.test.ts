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

import { usePublicEventListingQuery } from '@/hooks/domain/events/queries/usePublicEventListingQuery'

describe('usePublicEventListingQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps events to listing statuses and filters closed ones', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({
      data: [
        {
          id: 'evt-open',
          slug: 'open-event',
          title: 'Open Event',
          starts_at: '2026-07-10T00:00:00.000Z',
          registration_opens_at: '2026-06-01T00:00:00.000Z',
          registration_closes_at: '2026-07-09T00:00:00.000Z',
        },
        {
          id: 'evt-upcoming',
          slug: 'upcoming-event',
          title: 'Upcoming Event',
          starts_at: '2026-08-01T00:00:00.000Z',
          registration_opens_at: '2026-07-01T00:00:00.000Z',
          registration_closes_at: '2026-08-01T00:00:00.000Z',
        },
        {
          id: 'evt-past',
          slug: 'past-event',
          title: 'Past Event',
          starts_at: '2026-06-20T00:00:00.000Z',
          registration_opens_at: '2026-05-01T00:00:00.000Z',
          registration_closes_at: '2026-06-19T00:00:00.000Z',
        },
      ],
      error: null,
    })

    const { result } = renderHookWithClient(() => usePublicEventListingQuery())

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([
      expect.objectContaining({ slug: 'open-event', listingStatus: 'open' }),
      expect.objectContaining({ slug: 'upcoming-event', listingStatus: 'upcoming' }),
      expect.objectContaining({ slug: 'past-event', listingStatus: 'past' }),
    ])
  })

  it('returns query error state when listing query fails', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({
      data: null,
      error: new Error('listing failed'),
    })

    const { result } = renderHookWithClient(() => usePublicEventListingQuery())

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('handles null listing rows and resolves with an empty list', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const { result } = renderHookWithClient(() => usePublicEventListingQuery())

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('filters out events that are closed and not recent past while keeping open events with null close date', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({
      data: [
        {
          id: 'evt-filtered',
          slug: 'filtered',
          title: 'Filtered',
          starts_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          registration_opens_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          registration_closes_at: new Date(Date.now() - 1000).toISOString(),
        },
        {
          id: 'evt-open',
          slug: 'open-no-close',
          title: 'Open No Close',
          starts_at: null,
          registration_opens_at: null,
          registration_closes_at: null,
        },
      ],
      error: null,
    })

    const { result } = renderHookWithClient(() => usePublicEventListingQuery())

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([
      expect.objectContaining({ slug: 'open-no-close', listingStatus: 'open' }),
    ])
  })
})
