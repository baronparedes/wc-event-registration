import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCheckInQueueState } from '@/hooks/domain/attendance/state/useCheckInQueueState';
import type { CheckInAttendeeInput, CheckInResult } from '@/lib/domain/attendance';

const payload: CheckInAttendeeInput = {
  event_id: 'event-1',
  attendee_kind: 'registered',
  registration_id: 'reg-1',
};

describe('useCheckInQueueState', () => {
  const checkedInResult: CheckInResult = {
    success: true,
    status: 'checked_in',
    attendee_kind: 'registered',
    official_check_in_time: '2026-07-12T08:00:00.000Z',
    message: 'Attendee checked in successfully.',
  };

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('enqueues offline check-ins and persists queue entries', () => {
    const execute = vi.fn(async () => checkedInResult);

    const { result } = renderHook(() => useCheckInQueueState({ isOnline: false, execute }));

    act(() => {
      result.current.enqueue(payload);
    });

    expect(result.current.summary.pending).toBe(1);
    expect(result.current.summary.total).toBe(1);
    expect(execute).not.toHaveBeenCalled();

    const stored = window.localStorage.getItem('admin-check-in-queue-v1');
    expect(stored).toBeTruthy();
  });

  it('replays pending entries when online and marks them synced', async () => {
    const execute = vi.fn(async () => checkedInResult);

    const { result } = renderHook(() => useCheckInQueueState({ isOnline: true, execute }));

    act(() => {
      result.current.enqueue(payload);
    });

    await waitFor(() => {
      expect(result.current.summary.synced).toBe(1);
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.current.summary.pending).toBe(0);
    expect(result.current.summary.failed).toBe(0);
    expect(result.current.items[0]?.syncResultStatus).toBe('checked_in');
    expect(result.current.items[0]?.syncResultMessage).toBe('Attendee checked in successfully.');
  });

  it('marks failed sync attempts and retries them', async () => {
    const execute = vi
      .fn<(_payload: CheckInAttendeeInput) => Promise<CheckInResult>>()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        success: true,
        status: 'already_checked_in',
        attendee_kind: 'registered',
        official_check_in_time: '2026-07-12T08:05:00.000Z',
        message: 'Attendee was already checked in.',
      });

    const { result } = renderHook(() => useCheckInQueueState({ isOnline: true, execute }));

    act(() => {
      result.current.enqueue(payload);
    });

    await waitFor(() => {
      expect(result.current.summary.failed).toBe(1);
    });

    act(() => {
      result.current.retryFailed();
    });

    await waitFor(() => {
      expect(result.current.summary.synced).toBe(1);
    });

    expect(result.current.summary.failed).toBe(0);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(result.current.items[0]?.syncResultStatus).toBe('already_checked_in');
    expect(result.current.items[0]?.syncResultMessage).toBe('Attendee was already checked in.');
  });

  it('no-ops when queue feature is disabled', async () => {
    const execute = vi.fn(async () => checkedInResult);

    const { result } = renderHook(() =>
      useCheckInQueueState({ enabled: false, isOnline: true, execute }),
    );

    expect(result.current.enqueue(payload)).toBe('');

    act(() => {
      result.current.retryFailed();
      result.current.clearSynced();
      void result.current.processQueue();
    });

    await waitFor(() => {
      expect(result.current.summary.total).toBe(0);
    });

    expect(execute).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('admin-check-in-queue-v1')).toBeNull();
  });

  it('initializes with an empty queue when stored value is invalid json', () => {
    window.localStorage.setItem('admin-check-in-queue-v1', '{invalid-json');
    const execute = vi.fn(async () => checkedInResult);

    const { result } = renderHook(() => useCheckInQueueState({ isOnline: false, execute }));

    expect(result.current.items).toEqual([]);
    expect(result.current.summary.total).toBe(0);
  });

  it('initializes with an empty queue when stored value is not an array', () => {
    window.localStorage.setItem('admin-check-in-queue-v1', JSON.stringify({ id: 'x' }));
    const execute = vi.fn(async () => checkedInResult);

    const { result } = renderHook(() => useCheckInQueueState({ isOnline: false, execute }));

    expect(result.current.items).toEqual([]);
    expect(result.current.summary.total).toBe(0);
  });

  it('filters out malformed stored entries and keeps valid ones', () => {
    window.localStorage.setItem(
      'admin-check-in-queue-v1',
      JSON.stringify([
        null,
        { id: 1, createdAt: '2026-07-12T08:00:00.000Z', attempts: 0, status: 'pending', payload },
        {
          id: 'valid-1',
          createdAt: '2026-07-12T08:00:00.000Z',
          attempts: 1,
          status: 'failed',
          payload,
        },
        {
          id: 'bad-status',
          createdAt: '2026-07-12T08:00:00.000Z',
          attempts: 1,
          status: 'unknown',
          payload,
        },
        {
          id: 'missing-payload',
          createdAt: '2026-07-12T08:00:00.000Z',
          attempts: 1,
          status: 'pending',
        },
      ]),
    );

    const execute = vi.fn(async () => checkedInResult);
    const { result } = renderHook(() => useCheckInQueueState({ isOnline: false, execute }));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.id).toBe('valid-1');
    expect(result.current.summary.failed).toBe(1);
    expect(result.current.summary.total).toBe(1);
  });

  it('clears synced entries from the queue', async () => {
    const execute = vi.fn(async () => checkedInResult);

    const { result } = renderHook(() => useCheckInQueueState({ isOnline: true, execute }));

    act(() => {
      result.current.enqueue(payload);
    });

    await waitFor(() => {
      expect(result.current.summary.synced).toBe(1);
    });

    act(() => {
      result.current.clearSynced();
    });

    expect(result.current.summary.synced).toBe(0);
    expect(result.current.summary.total).toBe(0);
    expect(result.current.items).toEqual([]);
  });
});
