import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useCancelRegistrationMutation } from '@/hooks/domain/registrations/mutations/useCancelRegistrationMutation';
import { ADMIN_REGISTRATIONS_QUERY_KEY } from '@/hooks/domain/registrations/queries/useAdminRegistrationsQuery';

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

describe('useCancelRegistrationMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls cancel registration edge function with data and invalidates query', async () => {
    const eventId = faker.string.uuid();
    const registrationId = faker.string.uuid();
    const reason = faker.lorem.sentence();
    const requestData = { registration_id: registrationId, reason };

    mockCaller.mockResolvedValueOnce({ success: true, registration_id: registrationId });

    const { result, queryClient } = renderHookWithClient(() =>
      useCancelRegistrationMutation(eventId),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const response = await act(async () => result.current.mutateAsync(requestData));

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('cancel-registration');
    expect(mockCaller).toHaveBeenCalledWith(requestData);
    expect(response).toEqual({ success: true, registration_id: registrationId });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ADMIN_REGISTRATIONS_QUERY_KEY(eventId),
    });
  });

  it('throws an error if the edge function returns success: false', async () => {
    const eventId = faker.string.uuid();
    const registrationId = faker.string.uuid();
    const requestData = { registration_id: registrationId };
    const errorMessage = 'Cancellation failed';

    mockCaller.mockResolvedValueOnce({ success: false, error: errorMessage });

    const { result, queryClient } = renderHookWithClient(() =>
      useCancelRegistrationMutation(eventId),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await expect(act(async () => result.current.mutateAsync(requestData))).rejects.toThrow(
      errorMessage,
    );

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('cancel-registration');
    expect(mockCaller).toHaveBeenCalledWith(requestData);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('throws a default error if the edge function returns success: false without error message', async () => {
    const eventId = faker.string.uuid();
    const registrationId = faker.string.uuid();
    const requestData = { registration_id: registrationId };

    mockCaller.mockResolvedValueOnce({ success: false });

    const { result, queryClient } = renderHookWithClient(() =>
      useCancelRegistrationMutation(eventId),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await expect(act(async () => result.current.mutateAsync(requestData))).rejects.toThrow(
      'Failed to cancel registration',
    );

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('cancel-registration');
    expect(mockCaller).toHaveBeenCalledWith(requestData);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
