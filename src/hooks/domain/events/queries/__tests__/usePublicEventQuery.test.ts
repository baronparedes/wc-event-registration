import { waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const FIXED_NOW = new Date('2026-06-15T00:00:00.000Z').getTime()

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
  let testEventSlug: string

  beforeEach(() => {
    // Generate stable slug once per test to ensure queryKey doesn't change
    testEventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase()
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns available status for open registration', async () => {
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase()
    const eventId = faker.string.uuid()
    const registrationCount = faker.number.int({ min: 1, max: 100 })
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: eventId,
        slug: eventSlug,
        title: faker.lorem.sentence(),
        registration_mode: 'open',
        registration_opens_at: '2026-06-01T00:00:00.000Z',
        registration_closes_at: '2026-07-01T00:00:00.000Z',
        allow_public_registrations: true,
      },
      error: null,
    })

    mockRpc.mockResolvedValueOnce({ data: registrationCount, error: null })

    const { result } = renderHookWithClient(() => usePublicEventQuery(eventSlug))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      status: 'available',
      event: {
        id: eventId,
        slug: eventSlug,
        title: expect.any(String),
        registration_mode: 'open',
        registration_opens_at: '2026-06-01T00:00:00.000Z',
        registration_closes_at: '2026-07-01T00:00:00.000Z',
        allow_public_registrations: true,
      },
      registration_count: registrationCount,
    })
  })

  it('keeps event accessible when guest registration is disabled', async () => {
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase()
    const eventId = faker.string.uuid()
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: eventId,
        slug: eventSlug,
        title: faker.lorem.sentence(),
        registration_mode: 'open',
        registration_opens_at: '2026-06-01T00:00:00.000Z',
        registration_closes_at: '2026-07-01T00:00:00.000Z',
        allow_public_registrations: false,
      },
      error: null,
    })

    mockRpc.mockResolvedValueOnce({ data: faker.number.int({ min: 1, max: 50 }), error: null })

    const { result } = renderHookWithClient(() => usePublicEventQuery(eventSlug))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      status: 'available',
      event: {
        id: eventId,
        slug: eventSlug,
        title: expect.any(String),
        registration_mode: 'open',
        registration_opens_at: '2026-06-01T00:00:00.000Z',
        registration_closes_at: '2026-07-01T00:00:00.000Z',
        allow_public_registrations: false,
      },
      registration_count: expect.any(Number),
    })
  })

  it('returns unavailable not_found_or_unpublished when event is missing', async () => {
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const { result } = renderHookWithClient(() => usePublicEventQuery(testEventSlug))

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

    const { result } = renderHookWithClient(() => usePublicEventQuery(testEventSlug))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('returns unavailable when registration mode is not open', async () => {
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase()
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: faker.string.uuid(),
        slug: eventSlug,
        title: faker.lorem.sentence(),
        registration_mode: 'closed',
        registration_opens_at: null,
        registration_closes_at: null,
        allow_public_registrations: true,
      },
      error: null,
    })

    const { result } = renderHookWithClient(() => usePublicEventQuery(eventSlug))

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
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase()
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: faker.string.uuid(),
        slug: eventSlug,
        title: faker.lorem.sentence(),
        registration_mode: 'open',
        registration_opens_at: futureDate,
        registration_closes_at: null,
        allow_public_registrations: true,
      },
      error: null,
    })

    const { result } = renderHookWithClient(() => usePublicEventQuery(eventSlug))

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
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase()
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: faker.string.uuid(),
        slug: eventSlug,
        title: faker.lorem.sentence(),
        registration_mode: 'open',
        registration_opens_at: null,
        registration_closes_at: pastDate,
        allow_public_registrations: true,
      },
      error: null,
    })

    const { result } = renderHookWithClient(() => usePublicEventQuery(eventSlug))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toMatchObject({
      status: 'unavailable',
      reason: 'registration_closed',
    })
  })

  it('falls back to 0 registration count when count RPC is unavailable', async () => {
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase()
    mockEventsQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: faker.string.uuid(),
        slug: eventSlug,
        title: faker.lorem.sentence(),
        registration_mode: 'open',
        registration_opens_at: null,
        registration_closes_at: null,
        allow_public_registrations: true,
      },
      error: null,
    })

    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('rpc failed') })

    const { result } = renderHookWithClient(() => usePublicEventQuery(eventSlug))

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
