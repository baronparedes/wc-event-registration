import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { usePublicAttendeeCheckQuery } from '@/hooks/domain/public-registrations/queries/usePublicAttendeeCheckQuery';

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

describe('usePublicAttendeeCheckQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns existing registration when edge function succeeds', async () => {
    const existing = {
      exists: true,
      edit_allowed: false,
      status: 'submitted',
      responses: {},
    };
    const email = faker.internet.email();
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();

    mockCaller.mockResolvedValueOnce({
      success: true,
      existing_registration: existing,
    });

    const { result } = renderHookWithClient(() => usePublicAttendeeCheckQuery(email, eventSlug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(existing);
  });

  it('returns null when edge function succeeds without existing registration', async () => {
    const email = faker.internet.email();
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();

    mockCaller.mockResolvedValueOnce({
      success: true,
    });

    const { result } = renderHookWithClient(() => usePublicAttendeeCheckQuery(email, eventSlug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it('returns null when attendee is not found', async () => {
    const email = faker.internet.email();
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();

    mockCaller.mockResolvedValueOnce({ success: false, reason: 'not_found' });

    const { result } = renderHookWithClient(() => usePublicAttendeeCheckQuery(email, eventSlug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it('throws edge function reason for non-not-found failures', async () => {
    const email = faker.internet.email();
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();

    mockCaller.mockResolvedValueOnce({ success: false, reason: 'forbidden' });

    const { result } = renderHookWithClient(() => usePublicAttendeeCheckQuery(email, eventSlug));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('forbidden');
  });

  it('throws default error when failure reason is missing', async () => {
    const email = faker.internet.email();
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();

    mockCaller.mockResolvedValueOnce({ success: false });

    const { result } = renderHookWithClient(() => usePublicAttendeeCheckQuery(email, eventSlug));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Failed to check attendee');
  });

  it('returns null when refetched with missing email/event slug', async () => {
    const { result } = renderHookWithClient(() => usePublicAttendeeCheckQuery(null, null));

    await act(async () => {
      const refetchResult = await result.current.refetch();
      expect(refetchResult.data).toBeNull();
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockCaller).not.toHaveBeenCalled();
  });

  it('queries attendee check when both email and event slug are provided', async () => {
    const existing = {
      exists: true,
      edit_allowed: false,
      status: 'submitted',
      responses: {},
    };
    const email = faker.internet.email();
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();

    mockCaller.mockResolvedValueOnce({
      success: true,
      existing_registration: existing,
    });

    const { result } = renderHookWithClient(() => usePublicAttendeeCheckQuery(email, eventSlug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(existing);
    expect(mockCaller).toHaveBeenCalledTimes(1);
  });
});
