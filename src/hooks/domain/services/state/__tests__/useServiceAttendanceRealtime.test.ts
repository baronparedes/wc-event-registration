import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useServiceAttendanceRealtime } from '../useServiceAttendanceRealtime';

const { mockChannel, mockOn, mockSubscribe, mockRemoveChannel, mockSupabaseChannel } = vi.hoisted(
  () => {
    const channel: Record<string, ReturnType<typeof vi.fn>> = {
      on: vi.fn(),
      subscribe: vi.fn(),
    };

    channel.on.mockReturnValue(channel);
    channel.subscribe.mockReturnValue(channel);

    return {
      mockChannel: channel,
      mockOn: channel.on,
      mockSubscribe: channel.subscribe,
      mockRemoveChannel: vi.fn(),
      mockSupabaseChannel: vi.fn(() => channel),
    };
  },
);

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    supabase: {
      channel: mockSupabaseChannel,
      removeChannel: mockRemoveChannel,
    },
  };
});

describe('useServiceAttendanceRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel.on.mockReturnValue(mockChannel);
    mockChannel.subscribe.mockReturnValue(mockChannel);
    mockSupabaseChannel.mockReturnValue(mockChannel);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not subscribe when realtime listening is disabled', () => {
    const onAttendanceChange = vi.fn();
    renderHook(() =>
      useServiceAttendanceRealtime('2026-03-15', { onAttendanceChange, enabled: false }),
    );

    expect(mockSupabaseChannel).not.toHaveBeenCalled();
  });

  it('subscribes with date filter when serviceDate is provided', () => {
    const onAttendanceChange = vi.fn();
    renderHook(() =>
      useServiceAttendanceRealtime('2026-03-15', { onAttendanceChange, enabled: true }),
    );

    expect(mockSupabaseChannel).toHaveBeenCalledWith('service-attendance:2026-03-15');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'service_attendance',
        filter: 'service_date=eq.2026-03-15',
      }),
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('subscribes without date filter when serviceDate is undefined', () => {
    const onAttendanceChange = vi.fn();
    renderHook(() =>
      useServiceAttendanceRealtime(undefined, { onAttendanceChange, enabled: true }),
    );

    expect(mockSupabaseChannel).toHaveBeenCalledWith('service-attendance:all');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_attendance',
      },
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('calls onAttendanceChange on INSERT payload', () => {
    const onAttendanceChange = vi.fn();
    renderHook(() => useServiceAttendanceRealtime('2026-03-15', { onAttendanceChange }));

    const callback = mockOn.mock.calls[0][2] as (payload: unknown) => void;

    callback({
      eventType: 'INSERT',
      new: {
        id: 'att-1',
        user_id: 'usr-1',
        service_date: '2026-03-15',
        time_slot: '9AM',
        checked_in_at: '2026-03-15T09:05:00Z',
        is_walk_in: true,
        is_override: false,
      },
    });

    expect(onAttendanceChange).toHaveBeenCalledWith({
      eventType: 'INSERT',
      id: 'att-1',
      user_id: 'usr-1',
      service_date: '2026-03-15',
      time_slot: '9AM',
      checked_in_at: '2026-03-15T09:05:00Z',
      is_walk_in: true,
      is_override: false,
    });
  });

  it('calls onAttendanceChange on UPDATE payload', () => {
    const onAttendanceChange = vi.fn();
    renderHook(() => useServiceAttendanceRealtime('2026-03-15', { onAttendanceChange }));

    const callback = mockOn.mock.calls[0][2] as (payload: unknown) => void;

    callback({
      eventType: 'UPDATE',
      new: {
        id: 'att-2',
        user_id: 'usr-2',
        service_date: '2026-03-15',
        time_slot: '12NN',
        checked_in_at: '2026-03-15T12:00:00Z',
        is_walk_in: false,
        is_override: true,
      },
    });

    expect(onAttendanceChange).toHaveBeenCalledWith({
      eventType: 'UPDATE',
      id: 'att-2',
      user_id: 'usr-2',
      service_date: '2026-03-15',
      time_slot: '12NN',
      checked_in_at: '2026-03-15T12:00:00Z',
      is_walk_in: false,
      is_override: true,
    });
  });

  it('calls onAttendanceChange on DELETE payload with old row', () => {
    const onAttendanceChange = vi.fn();
    renderHook(() => useServiceAttendanceRealtime('2026-03-15', { onAttendanceChange }));

    const callback = mockOn.mock.calls[0][2] as (payload: unknown) => void;

    callback({
      eventType: 'DELETE',
      old: {
        id: 'att-3',
        user_id: 'usr-3',
        service_date: '2026-03-15',
        time_slot: '3PM',
        checked_in_at: '2026-03-15T15:00:00Z',
        is_walk_in: false,
        is_override: false,
      },
    });

    expect(onAttendanceChange).toHaveBeenCalledWith({
      eventType: 'DELETE',
      id: 'att-3',
      user_id: 'usr-3',
      service_date: '2026-03-15',
      time_slot: '3PM',
      checked_in_at: '2026-03-15T15:00:00Z',
      is_walk_in: false,
      is_override: false,
    });
  });

  it('ignores malformed or unexpected payloads', () => {
    const onAttendanceChange = vi.fn();
    renderHook(() => useServiceAttendanceRealtime('2026-03-15', { onAttendanceChange }));

    const callback = mockOn.mock.calls[0][2] as (payload: unknown) => void;

    // Unknown event type
    callback({ eventType: 'UNKNOWN', new: {} });
    // Empty row
    callback({ eventType: 'INSERT', new: null });
    callback({ eventType: 'DELETE', old: null });

    expect(onAttendanceChange).not.toHaveBeenCalled();
  });

  it('removes channel on unmount', () => {
    const onAttendanceChange = vi.fn();
    const { unmount } = renderHook(() =>
      useServiceAttendanceRealtime('2026-03-15', { onAttendanceChange }),
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('resubscribes when serviceDate changes', () => {
    const onAttendanceChange = vi.fn();
    let serviceDate: string | undefined = '2026-03-15';
    const { rerender } = renderHook(() =>
      useServiceAttendanceRealtime(serviceDate, { onAttendanceChange }),
    );

    expect(mockSupabaseChannel).toHaveBeenCalledWith('service-attendance:2026-03-15');

    serviceDate = '2026-03-22';
    rerender();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    expect(mockSupabaseChannel).toHaveBeenCalledWith(
      'service-attendance:2026-22'.replace('22', '03-22'),
    );
  });

  it('logs errors when channel status is CHANNEL_ERROR or TIMED_OUT', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onAttendanceChange = vi.fn();

    mockSubscribe.mockImplementation((callback?: (status: string, err?: unknown) => void) => {
      callback?.('CHANNEL_ERROR', new Error('Connection refused'));
      return mockChannel;
    });

    renderHook(() => useServiceAttendanceRealtime('2026-03-15', { onAttendanceChange }));

    expect(errorSpy).toHaveBeenCalledWith(
      '[service-attendance] realtime subscription issue',
      expect.objectContaining({
        serviceDate: '2026-03-15',
        status: 'CHANNEL_ERROR',
      }),
    );

    errorSpy.mockRestore();
  });
});
