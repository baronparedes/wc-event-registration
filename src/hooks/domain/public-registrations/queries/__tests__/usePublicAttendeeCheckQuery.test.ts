import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import {
  fetchPublicAttendeeCheck,
  usePublicAttendeeCheckQuery,
} from '@/hooks/domain/public-registrations/queries/usePublicAttendeeCheckQuery';

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

describe('fetchPublicAttendeeCheck', () => {
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

    mockCaller.mockResolvedValueOnce({
      success: true,
      existing_registration: existing,
    });

    const result = await fetchPublicAttendeeCheck(
      faker.internet.email(),
      faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
    );

    expect(result).toEqual(existing);
  });

  it('returns null when attendee is not found', async () => {
    mockCaller.mockResolvedValueOnce({ success: false, reason: 'not_found' });

    const result = await fetchPublicAttendeeCheck(
      faker.internet.email(),
      faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
    );

    expect(result).toBeNull();
  });

  it('throws edge function reason for non-not-found failures', async () => {
    mockCaller.mockResolvedValueOnce({ success: false, reason: 'forbidden' });

    await expect(
      fetchPublicAttendeeCheck(
        faker.internet.email(),
        faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
      ),
    ).rejects.toThrow('forbidden');
  });

  it('throws default error when failure reason is missing', async () => {
    mockCaller.mockResolvedValueOnce({ success: false });

    await expect(
      fetchPublicAttendeeCheck(
        faker.internet.email(),
        faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
      ),
    ).rejects.toThrow('Failed to check attendee');
  });
});

describe('usePublicAttendeeCheckQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    mockCaller.mockResolvedValueOnce({
      success: true,
      existing_registration: existing,
    });

    const { result } = renderHookWithClient(() =>
      usePublicAttendeeCheckQuery(
        faker.internet.email(),
        faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
      ),
    );

    await act(async () => {
      const refetchResult = await result.current.refetch();
      expect(refetchResult.data).toEqual(existing);
    });

    await waitFor(() => {
      expect(mockCaller).toHaveBeenCalledTimes(1);
    });
  });
});
