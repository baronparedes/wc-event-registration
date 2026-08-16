import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { usePreparedOfflineAttendanceEventQuery } from '@/hooks/domain/attendance/state/usePreparedOfflineAttendanceEventQuery';

const { mockReadPreparedOfflineAttendanceEvent } = vi.hoisted(() => ({
  mockReadPreparedOfflineAttendanceEvent: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    readPreparedOfflineAttendanceEvent: mockReadPreparedOfflineAttendanceEvent,
  };
});

describe('usePreparedOfflineAttendanceEventQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads a prepared projection for the matching event and owner', async () => {
    const preparedEvent = { eventId: 'event-1', ownerUserId: 'user-1' };
    mockReadPreparedOfflineAttendanceEvent.mockResolvedValue(preparedEvent);

    const { result } = renderHookWithClient(() =>
      usePreparedOfflineAttendanceEventQuery('event-1', { userId: 'user-1', role: 'kiosk' }),
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(preparedEvent);
    });

    expect(mockReadPreparedOfflineAttendanceEvent).toHaveBeenCalledWith('event-1', {
      userId: 'user-1',
      role: 'kiosk',
    });
  });

  it('does not read a projection without an event and owner', () => {
    const { result } = renderHookWithClient(() =>
      usePreparedOfflineAttendanceEventQuery(undefined, null),
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockReadPreparedOfflineAttendanceEvent).not.toHaveBeenCalled();
  });
});
