import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { ADMIN_PUBLIC_REGISTRATIONS_QUERY_KEY } from '@/hooks/domain/public-registrations/queries/useAdminPublicRegistrationsQuery';

import { useBulkUpsertPublicRegistrationsMutation } from '../useBulkUpsertPublicRegistrationsMutation';

const { mockEdgeFunctionCaller } = vi.hoisted(() => ({
  mockEdgeFunctionCaller: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    createEdgeFunctionCaller: () => mockEdgeFunctionCaller,
  };
});

describe('useBulkUpsertPublicRegistrationsMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls edge function and invalidates caches on success', async () => {
    const eventId = faker.string.uuid();
    const rows = [
      {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        email: faker.internet.email(),
        answers: {},
      },
    ];
    const expectedResponse = {
      success: true,
      imported_count: 1,
      created_count: 1,
      updated_count: 0,
    };

    mockEdgeFunctionCaller.mockResolvedValueOnce(expectedResponse);

    const { result, queryClient } = renderHookWithClient(() =>
      useBulkUpsertPublicRegistrationsMutation(),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      const response = await result.current.mutateAsync({
        event_id: eventId,
        rows,
      });
      expect(response).toEqual(expectedResponse);
    });

    expect(mockEdgeFunctionCaller).toHaveBeenCalledWith({
      event_id: eventId,
      rows,
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ADMIN_PUBLIC_REGISTRATIONS_QUERY_KEY(eventId),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['publicRegistrationCount', eventId],
      });
    });
  });

  it('throws when edge function fails', async () => {
    const error = new Error('Edge function failed');
    mockEdgeFunctionCaller.mockRejectedValueOnce(error);

    const { result } = renderHookWithClient(() => useBulkUpsertPublicRegistrationsMutation());

    await expect(
      result.current.mutateAsync({
        event_id: faker.string.uuid(),
        rows: [],
      }),
    ).rejects.toThrow('Edge function failed');
  });
});
