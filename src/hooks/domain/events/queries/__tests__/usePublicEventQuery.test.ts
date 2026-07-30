import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { usePublicEventQuery } from '@/hooks/domain/events/queries/usePublicEventQuery';

const FIXED_NOW = new Date('2026-06-15T00:00:00.000Z').getTime();

const { mockCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const caller = vi.fn();
  return {
    mockCaller: caller,
    mockCreateEdgeFunctionCaller: vi.fn(() => caller),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  };
});

describe('usePublicEventQuery', () => {
  let testEventSlug: string;

  beforeEach(() => {
    testEventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns available status for open registration', async () => {
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();
    const eventId = faker.string.uuid();
    const registrationCount = faker.number.int({ min: 1, max: 100 });

    mockCaller.mockResolvedValueOnce({
      success: true,
      event: {
        id: eventId,
        slug: eventSlug,
        title: faker.lorem.sentence(),
        registration_mode: 'open',
        registration_opens_at: '2026-06-01T00:00:00.000Z',
        registration_closes_at: '2026-07-01T00:00:00.000Z',
        allow_public_registrations: true,
      },
      registration_count: registrationCount,
    });

    const { result } = renderHookWithClient(() => usePublicEventQuery(eventSlug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

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
    });

    expect(mockCaller).toHaveBeenCalledWith({ slug: eventSlug });
  });

  it('keeps event accessible when guest registration is disabled', async () => {
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();
    const eventId = faker.string.uuid();

    mockCaller.mockResolvedValueOnce({
      success: true,
      event: {
        id: eventId,
        slug: eventSlug,
        title: faker.lorem.sentence(),
        registration_mode: 'open',
        registration_opens_at: '2026-06-01T00:00:00.000Z',
        registration_closes_at: '2026-07-01T00:00:00.000Z',
        allow_public_registrations: false,
      },
      registration_count: faker.number.int({ min: 1, max: 50 }),
    });

    const { result } = renderHookWithClient(() => usePublicEventQuery(eventSlug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      status: 'available',
      event: expect.objectContaining({ allow_public_registrations: false }),
      registration_count: expect.any(Number),
    });
  });

  it('returns unavailable not_found_or_unpublished when event is missing', async () => {
    mockCaller.mockResolvedValueOnce({ success: true, event: null, registration_count: 0 });

    const { result } = renderHookWithClient(() => usePublicEventQuery(testEventSlug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      status: 'unavailable',
      reason: 'not_found_or_unpublished',
    });
  });

  it('returns query error state when event lookup fails', async () => {
    mockCaller.mockRejectedValueOnce(new Error('event lookup failed'));

    const { result } = renderHookWithClient(() => usePublicEventQuery(testEventSlug));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('returns unavailable when registration mode is not open', async () => {
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();

    mockCaller.mockResolvedValueOnce({
      success: true,
      event: {
        id: faker.string.uuid(),
        slug: eventSlug,
        title: faker.lorem.sentence(),
        registration_mode: 'closed',
        registration_opens_at: null,
        registration_closes_at: null,
        allow_public_registrations: true,
      },
      registration_count: 0,
    });

    const { result } = renderHookWithClient(() => usePublicEventQuery(eventSlug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      status: 'unavailable',
      reason: 'registration_closed',
    });
  });

  it('returns unavailable when registration has not opened yet', async () => {
    const futureDate = new Date(Date.now() + 60_000).toISOString();
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();

    mockCaller.mockResolvedValueOnce({
      success: true,
      event: {
        id: faker.string.uuid(),
        slug: eventSlug,
        title: faker.lorem.sentence(),
        registration_mode: 'open',
        registration_opens_at: futureDate,
        registration_closes_at: null,
        allow_public_registrations: true,
      },
      registration_count: 0,
    });

    const { result } = renderHookWithClient(() => usePublicEventQuery(eventSlug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      status: 'unavailable',
      reason: 'not_open_yet',
    });
  });

  it('returns unavailable when registration is closed by date', async () => {
    const pastDate = new Date(Date.now() - 60_000).toISOString();
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();

    mockCaller.mockResolvedValueOnce({
      success: true,
      event: {
        id: faker.string.uuid(),
        slug: eventSlug,
        title: faker.lorem.sentence(),
        registration_mode: 'open',
        registration_opens_at: null,
        registration_closes_at: pastDate,
        allow_public_registrations: true,
      },
      registration_count: 0,
    });

    const { result } = renderHookWithClient(() => usePublicEventQuery(eventSlug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      status: 'unavailable',
      reason: 'registration_closed',
    });
  });

  it('uses registration_count from edge function response', async () => {
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();

    mockCaller.mockResolvedValueOnce({
      success: true,
      event: {
        id: faker.string.uuid(),
        slug: eventSlug,
        title: faker.lorem.sentence(),
        registration_mode: 'open',
        registration_opens_at: null,
        registration_closes_at: null,
        allow_public_registrations: true,
      },
      registration_count: 0,
    });

    const { result } = renderHookWithClient(() => usePublicEventQuery(eventSlug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      status: 'available',
      registration_count: 0,
    });
  });
});
