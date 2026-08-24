import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { usePublicEventListingQuery } from '@/hooks/domain/events/queries/usePublicEventListingQuery';

const FIXED_NOW = new Date('2026-06-25T00:00:00.000Z').getTime();

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

describe('usePublicEventListingQuery', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps events to listing statuses and filters closed ones', async () => {
    mockCaller.mockResolvedValueOnce({
      success: true,
      events: [
        {
          id: 'evt-open',
          slug: 'open-event',
          title: 'Open Event',
          starts_at: '2026-08-30T00:00:00.000Z',
          registration_opens_at: '2026-06-01T00:00:00.000Z',
          registration_closes_at: '2026-08-02T00:00:00.000Z',
          registration_mode: 'open',
        },
        {
          id: 'evt-upcoming',
          slug: 'upcoming-event',
          title: 'Upcoming Event',
          starts_at: '2026-08-30T00:00:00.000Z',
          registration_opens_at: '2026-06-01T00:00:00.000Z',
          registration_closes_at: '2026-08-02T00:00:00.000Z',
          registration_mode: 'closed',
        },
        {
          id: 'evt-upcoming-2',
          slug: 'upcoming-event-2',
          title: 'Upcoming Event 2',
          starts_at: '2026-08-30T00:00:00.000Z',
          registration_opens_at: '2026-06-01T00:00:00.000Z',
          registration_closes_at: '2026-06-02T00:00:00.000Z',
          registration_mode: 'open',
        },
        {
          id: 'evt-past',
          slug: 'past-event',
          title: 'Past Event',
          starts_at: '2026-06-24T00:00:00.000Z',
          registration_opens_at: '2026-01-01T00:00:00.000Z',
          registration_closes_at: '2026-06-23T00:00:00.000Z',
          registration_mode: 'past',
        },
      ],
    });

    const { result } = renderHookWithClient(() => usePublicEventListingQuery());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([
      expect.objectContaining({ slug: 'open-event', listingStatus: 'open' }),
      expect.objectContaining({ slug: 'upcoming-event', listingStatus: 'upcoming' }),
      expect.objectContaining({ slug: 'upcoming-event-2', listingStatus: 'upcoming' }),
      expect.objectContaining({ slug: 'past-event', listingStatus: 'past' }),
    ]);
  });

  it('returns query error state when listing query fails', async () => {
    mockCaller.mockRejectedValueOnce(new Error('listing failed'));

    const { result } = renderHookWithClient(() => usePublicEventListingQuery());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('handles empty events list and resolves with an empty list', async () => {
    mockCaller.mockResolvedValueOnce({ success: true, events: [] });

    const { result } = renderHookWithClient(() => usePublicEventListingQuery());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('keeps same-day in-progress events as open instead of past', async () => {
    mockCaller.mockResolvedValueOnce({
      success: true,
      events: [
        {
          id: 'evt-same-day',
          slug: 'same-day',
          title: 'Same Day',
          starts_at: '2026-06-24T23:00:00.000Z',
          ends_at: '2026-06-25T01:00:00.000Z',
          registration_opens_at: '2026-06-01T00:00:00.000Z',
          registration_closes_at: null,
        },
      ],
    });

    const { result } = renderHookWithClient(() => usePublicEventListingQuery());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([
      expect.objectContaining({ slug: 'same-day', listingStatus: 'open' }),
    ]);
  });
});
