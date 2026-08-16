import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useOfflineCheckInOutboxState } from '@/hooks/domain/attendance/state/useOfflineCheckInOutboxState';

const { mockListOfflineCheckIns } = vi.hoisted(() => ({
  mockListOfflineCheckIns: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    listOfflineCheckIns: mockListOfflineCheckIns,
  };
});

describe('useOfflineCheckInOutboxState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads pending records and exposes their count and latest error', async () => {
    mockListOfflineCheckIns.mockResolvedValue([
      { id: 'operation-1', status: 'pending', lastError: null },
      { id: 'operation-2', status: 'failed', lastError: 'Invalid slot' },
    ]);

    const { result } = renderHookWithClient(() =>
      useOfflineCheckInOutboxState('event-1', { userId: 'user-1', role: 'kiosk' }),
    );

    await waitFor(() => {
      expect(result.current.queue).toHaveLength(2);
    });

    expect(result.current.pendingCount).toBe(1);
    expect(result.current.lastError).toBe('Invalid slot');
    expect(mockListOfflineCheckIns).toHaveBeenCalledWith('event-1', 'user-1');
  });

  it('stays empty without an event and owner', () => {
    const { result } = renderHookWithClient(() => useOfflineCheckInOutboxState(undefined, null));

    expect(result.current.queue).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mockListOfflineCheckIns).not.toHaveBeenCalled();
  });
});
