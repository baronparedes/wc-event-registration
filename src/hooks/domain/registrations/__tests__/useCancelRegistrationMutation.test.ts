import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useCancelRegistrationMutation } from '@/hooks/domain/registrations/mutations/useCancelRegistrationMutation';
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

describe('useCancelRegistrationMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEdgeFunctionCaller.mockReturnValue(mockEdgeCaller);
  });

  it('calls cancel-registration with expected payload', async () => {
    const eventId = faker.string.uuid();
    const registrationId = faker.string.uuid();
    mockEdgeCaller.mockResolvedValueOnce({
      success: true,
      registration_id: registrationId,
    });

    const { result } = renderHookWithClient(() => useCancelRegistrationMutation(eventId));

    await act(async () => {
      await result.current.mutateAsync({
        registration_id: registrationId,
        reason: 'No longer attending',
      });
    });

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('cancel-registration');
    expect(mockEdgeCaller).toHaveBeenCalledWith({
      registration_id: registrationId,
      reason: 'No longer attending',
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
      useCancelRegistrationMutation(eventId),
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
      error: 'Already cancelled',
      error_code: 'already_cancelled',
    });

    const { result } = renderHookWithClient(() =>
      useCancelRegistrationMutation(faker.string.uuid()),
    );

    await expect(
      result.current.mutateAsync({
        registration_id: faker.string.uuid(),
      }),
    ).rejects.toThrow('Already cancelled');
  });
});
