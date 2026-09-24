import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useReorderEventFieldsMutation } from '@/hooks/domain/event-fields/mutations/useReorderEventFieldsMutation';
import { adminEventFieldsQueryKey } from '@/hooks/domain/event-fields/queries/useAdminEventFieldsQuery';

const { mockEventsBuilder, mockUpsertBuilder, mockFrom } = vi.hoisted(() => {
  const eventsBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };
  eventsBuilder.select.mockReturnValue(eventsBuilder);
  eventsBuilder.eq.mockReturnValue(eventsBuilder);

  const upsertBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    upsert: vi.fn(),
  };
  upsertBuilder.upsert.mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === 'events') return eventsBuilder;
    if (table === 'event_fields') return upsertBuilder;
    throw new Error(`Unexpected table: ${table}`);
  });

  return { mockEventsBuilder: eventsBuilder, mockUpsertBuilder: upsertBuilder, mockFrom: from };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: {
      from: mockFrom,
    },
  };
});

describe('useReorderEventFieldsMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reorders fields for a draft event and invalidates field list', async () => {
    const eventId = faker.string.uuid();
    const fieldIds = [faker.string.uuid(), faker.string.uuid()];
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'draft' }, error: null });

    const { result, queryClient } = renderHookWithClient(() => useReorderEventFieldsMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({ event_id: eventId, orderedIds: fieldIds });
    });

    expect(mockUpsertBuilder.upsert).toHaveBeenCalledWith(
      [
        { id: fieldIds[0], event_id: eventId, display_order: 0 },
        { id: fieldIds[1], event_id: eventId, display_order: 1 },
      ],
      { onConflict: 'id', ignoreDuplicates: false },
    );
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminEventFieldsQueryKey(eventId) });
    });
  });

  it('rejects reordering fields for non-draft events', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'published' }, error: null });

    const { result } = renderHookWithClient(() => useReorderEventFieldsMutation());

    await expect(
      result.current.mutateAsync({
        event_id: faker.string.uuid(),
        orderedIds: [faker.string.uuid()],
      }),
    ).rejects.toThrow('Cannot reorder fields on a published or archived event');
  });

  it('throws when event status lookup fails', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error('lookup failed'),
    });

    const { result } = renderHookWithClient(() => useReorderEventFieldsMutation());

    await expect(
      result.current.mutateAsync({
        event_id: faker.string.uuid(),
        orderedIds: [faker.string.uuid()],
      }),
    ).rejects.toThrow('lookup failed');

    expect(mockUpsertBuilder.upsert).not.toHaveBeenCalled();
  });
});
