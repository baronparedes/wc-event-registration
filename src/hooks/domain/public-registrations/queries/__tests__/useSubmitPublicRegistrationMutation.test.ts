import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { QUERY_KEYS } from '@/config/constants';
import { useSubmitPublicRegistrationMutation } from '@/hooks/domain/public-registrations/queries/useSubmitPublicRegistrationMutation';

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

describe('useSubmitPublicRegistrationMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits registration and invalidates attendee-check and event queries', async () => {
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();
    const email = faker.internet.email();

    mockCaller.mockResolvedValueOnce({ success: true, registration_id: faker.string.uuid() });

    const { result, queryClient } = renderHookWithClient(() =>
      useSubmitPublicRegistrationMutation(),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({
        event_slug: eventSlug,
        attendee: {
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          nickname: null,
          email,
          phone: null,
        },
        responses: {},
        idempotency_key: faker.string.uuid(),
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['publicAttendeeCheck', email, eventSlug],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.publicEventBySlug(eventSlug),
    });
  });

  it('throws edge function message when submission fails', async () => {
    mockCaller.mockResolvedValueOnce({ success: false, message: 'Submission failed' });

    const { result } = renderHookWithClient(() => useSubmitPublicRegistrationMutation());

    await expect(
      result.current.mutateAsync({
        event_slug: faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
        attendee: {
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          nickname: null,
          email: faker.internet.email(),
          phone: null,
        },
        responses: {},
        idempotency_key: faker.string.uuid(),
      }),
    ).rejects.toThrow('Submission failed');
  });

  it('throws fallback message when failure does not include a message', async () => {
    mockCaller.mockResolvedValueOnce({ success: false });

    const { result } = renderHookWithClient(() => useSubmitPublicRegistrationMutation());

    await expect(
      result.current.mutateAsync({
        event_slug: faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
        attendee: {
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          nickname: null,
          email: faker.internet.email(),
          phone: null,
        },
        responses: {},
        idempotency_key: faker.string.uuid(),
      }),
    ).rejects.toThrow('Failed to submit registration');
  });
});
