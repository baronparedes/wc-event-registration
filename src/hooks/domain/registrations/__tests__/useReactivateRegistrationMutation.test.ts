import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useReactivateRegistrationMutation } from '@/hooks/domain/registrations/mutations/useReactivateRegistrationMutation';
import { ADMIN_REGISTRATIONS_QUERY_KEY } from '@/hooks/domain/registrations/queries/useAdminRegistrationsQuery';

const { mockEdgeCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => ({
  mockEdgeCaller: vi.fn(),
  mockCreateEdgeFunctionCaller: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  };
});

describe('useReactivateRegistrationMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEdgeFunctionCaller.mockReturnValue(mockEdgeCaller);
  });

  it('calls reactivate-registration with expected payload', async () => {
    const eventId = faker.string.uuid();
    const registrationId = faker.string.uuid();
    mockEdgeCaller.mockResolvedValueOnce({
      success: true,
      registration_id: registrationId,
    });

    const { result } = renderHookWithClient(() => useReactivateRegistrationMutation(eventId));

    await act(async () => {
      await result.current.mutateAsync({
        registration_id: registrationId,
      });
    });

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('reactivate-registration');
    expect(mockEdgeCaller).toHaveBeenCalledWith({
      registration_id: registrationId,
    });
  });

  it('invalidates admin registrations query on success', async () => {
    const eventId = faker.string.uuid();
    const registrationId = faker.string.uuid();
    mockEdgeCaller.mockResolvedValueOnce({
      success: true,
      registration_id: registrationId,
    });

    const { result, queryClient } = renderHookWithClient(() =>
      useReactivateRegistrationMutation(eventId),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({ registration_id: registrationId });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ADMIN_REGISTRATIONS_QUERY_KEY(eventId),
      });
    });
  });

  it('throws an error when edge function returns success false', async () => {
    mockEdgeCaller.mockResolvedValueOnce({
      success: false,
      error: 'Registration not cancelled',
      error_code: 'not_cancelled',
    });

    const { result } = renderHookWithClient(() =>
      useReactivateRegistrationMutation(faker.string.uuid()),
    );

    await expect(
      result.current.mutateAsync({
        registration_id: faker.string.uuid(),
      }),
    ).rejects.toThrow('Registration not cancelled');
  });
});
