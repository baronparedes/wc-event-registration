import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockEventsQueryBuilder, mockRpc, mockFrom, mockLogger } = vi.hoisted(() => {
  const eventsQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  }

  eventsQueryBuilder.select.mockReturnValue(eventsQueryBuilder)
  eventsQueryBuilder.eq.mockReturnValue(eventsQueryBuilder)

  return {
    mockEventsQueryBuilder: eventsQueryBuilder,
    mockRpc: vi.fn(),
    mockFrom: vi.fn(() => eventsQueryBuilder),
    mockLogger: {
      debug: vi.fn(),
      warn: vi.fn(),
    },
  }
})

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')

  return {
    ...actual,
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
    },
    logger: mockLogger,
  }
})

import { usePublicEventQuery } from '@/hooks/domain/events/queries/usePublicEventQuery'

describe('usePublicEventQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns available status for open registration', async () => {
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'evt-1',
        slug: 'sample-event',
        title: 'Sample Event',
        registration_mode: 'open',
        registration_opens_at: '2026-06-01T00:00:00.000Z',
        registration_closes_at: '2026-07-01T00:00:00.000Z',
      },
      error: null,
    })

    mockRpc.mockResolvedValueOnce({ data: 12, error: null })

    const { result } = renderHookWithClient(() => usePublicEventQuery('sample-event'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      status: 'available',
      event: {
        id: 'evt-1',
        slug: 'sample-event',
        title: 'Sample Event',
        registration_mode: 'open',
        registration_opens_at: '2026-06-01T00:00:00.000Z',
        registration_closes_at: '2026-07-01T00:00:00.000Z',
      },
      registration_count: 12,
    })
  })

  it('returns unavailable not_found_or_unpublished when event is missing', async () => {
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const { result } = renderHookWithClient(() => usePublicEventQuery('missing-event'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      status: 'unavailable',
      reason: 'not_found_or_unpublished',
    })
  })
})
