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

  it('returns query error state when event lookup fails', async () => {
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('event lookup failed'),
    })

    const { result } = renderHookWithClient(() => usePublicEventQuery('sample-event'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('returns unavailable when registration mode is not open', async () => {
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'evt-2',
        slug: 'closed-event',
        title: 'Closed Event',
        registration_mode: 'closed',
        registration_opens_at: null,
        registration_closes_at: null,
      },
      error: null,
    })

    const { result } = renderHookWithClient(() => usePublicEventQuery('closed-event'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toMatchObject({
      status: 'unavailable',
      reason: 'registration_closed',
    })
  })

  it('returns unavailable when registration has not opened yet', async () => {
    const futureDate = new Date(Date.now() + 60_000).toISOString()
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'evt-3',
        slug: 'future-event',
        title: 'Future Event',
        registration_mode: 'open',
        registration_opens_at: futureDate,
        registration_closes_at: null,
      },
      error: null,
    })

    const { result } = renderHookWithClient(() => usePublicEventQuery('future-event'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toMatchObject({
      status: 'unavailable',
      reason: 'not_open_yet',
    })
  })

  it('returns unavailable when registration is closed by date', async () => {
    const pastDate = new Date(Date.now() - 60_000).toISOString()
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'evt-4',
        slug: 'past-event',
        title: 'Past Event',
        registration_mode: 'open',
        registration_opens_at: null,
        registration_closes_at: pastDate,
      },
      error: null,
    })

    const { result } = renderHookWithClient(() => usePublicEventQuery('past-event'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toMatchObject({
      status: 'unavailable',
      reason: 'registration_closed',
    })
  })

  it('falls back to 0 registration count when count RPC is unavailable', async () => {
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'evt-5',
        slug: 'sample-event',
        title: 'Sample Event',
        registration_mode: 'open',
        registration_opens_at: null,
        registration_closes_at: null,
      },
      error: null,
    })

    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('rpc failed') })

    const { result } = renderHookWithClient(() => usePublicEventQuery('sample-event'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockLogger.warn).toHaveBeenCalled()
    expect(result.current.data).toMatchObject({
      status: 'available',
      registration_count: 0,
    })
  })
})
