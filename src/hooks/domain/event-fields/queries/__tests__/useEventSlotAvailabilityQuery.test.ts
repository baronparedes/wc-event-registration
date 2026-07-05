import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useEventSlotAvailabilityQuery } from '@/hooks/domain/event-fields/queries/useEventSlotAvailabilityQuery';

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

describe('useEventSlotAvailabilityQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns slot availability payload when edge function succeeds', async () => {
    const eventId = faker.string.uuid();

    mockCaller.mockResolvedValueOnce({
      success: true,
      event_id: eventId,
      fields: [
        {
          field_id: 'field-1',
          field_key: 'service_time',
          field_label: 'Service Time',
          options: [
            {
              value: '9am',
              label: '9 AM',
              allotted_slots: 10,
              used_slots: 3,
              remaining_slots: 7,
            },
          ],
        },
      ],
    });

    const { result } = renderHookWithClient(() => useEventSlotAvailabilityQuery(eventId));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCaller).toHaveBeenCalledWith({ event_id: eventId });
    expect(result.current.data?.event_id).toBe(eventId);
  });

  it('returns query error state when edge function reports failure', async () => {
    mockCaller.mockResolvedValueOnce({ success: false });

    const { result } = renderHookWithClient(() =>
      useEventSlotAvailabilityQuery(faker.string.uuid()),
    );

    await act(async () => {
      const response = await result.current.refetch();
      expect(response.isError).toBe(true);
    });
  });

  it('returns null payload when refetched without an event id', async () => {
    const { result } = renderHookWithClient(() => useEventSlotAvailabilityQuery(undefined));

    await act(async () => {
      const response = await result.current.refetch();
      expect(response.data).toBeNull();
    });

    expect(mockCreateEdgeFunctionCaller).not.toHaveBeenCalled();
    expect(mockCaller).not.toHaveBeenCalled();
  });
});
