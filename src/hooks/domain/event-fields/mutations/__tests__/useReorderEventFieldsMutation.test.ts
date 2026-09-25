import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useReorderEventFieldsMutation } from '@/hooks/domain/event-fields/mutations/useReorderEventFieldsMutation';
import { adminEventFieldsQueryKey } from '@/hooks/domain/event-fields/queries/useAdminEventFieldsQuery';

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: {
      rpc: mockRpc,
    },
  };
});

describe('useReorderEventFieldsMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it('reorders fields via RPC and invalidates field list', async () => {
    const eventId = faker.string.uuid();
    const fieldIds = [faker.string.uuid(), faker.string.uuid()];

    const { result, queryClient } = renderHookWithClient(() => useReorderEventFieldsMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({ event_id: eventId, orderedIds: fieldIds });
    });

    expect(mockRpc).toHaveBeenCalledWith('reorder_event_fields', {
      p_event_id: eventId,
      p_ordered_ids: fieldIds,
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminEventFieldsQueryKey(eventId) });
    });
  });

  it('throws when RPC returns an error', async () => {
    const eventId = faker.string.uuid();
    const fieldIds = [faker.string.uuid()];
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Cannot reorder fields on a published or archived event.'),
    });

    const { result } = renderHookWithClient(() => useReorderEventFieldsMutation());

    await expect(
      result.current.mutateAsync({
        event_id: eventId,
        orderedIds: fieldIds,
      }),
    ).rejects.toThrow('Cannot reorder fields on a published or archived event.');

    expect(mockRpc).toHaveBeenCalledWith('reorder_event_fields', {
      p_event_id: eventId,
      p_ordered_ids: fieldIds,
    });
  });

  it('handles single field reorder', async () => {
    const eventId = faker.string.uuid();
    const fieldIds = [faker.string.uuid()];

    const { result } = renderHookWithClient(() => useReorderEventFieldsMutation());

    await act(async () => {
      await result.current.mutateAsync({ event_id: eventId, orderedIds: fieldIds });
    });

    expect(mockRpc).toHaveBeenCalledWith('reorder_event_fields', {
      p_event_id: eventId,
      p_ordered_ids: fieldIds,
    });
  });

  it('handles empty orderedIds array', async () => {
    const eventId = faker.string.uuid();

    const { result } = renderHookWithClient(() => useReorderEventFieldsMutation());

    await act(async () => {
      await result.current.mutateAsync({ event_id: eventId, orderedIds: [] });
    });

    expect(mockRpc).toHaveBeenCalledWith('reorder_event_fields', {
      p_event_id: eventId,
      p_ordered_ids: [],
    });
  });
});
