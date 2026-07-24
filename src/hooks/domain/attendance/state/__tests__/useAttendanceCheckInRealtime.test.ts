import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAttendanceCheckInRealtime } from '../useAttendanceCheckInRealtime';

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

describe('useAttendanceCheckInRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel.on.mockReturnValue(mockChannel);
    mockChannel.subscribe.mockReturnValue(mockChannel);
    mockSupabaseChannel.mockReturnValue(mockChannel);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not subscribe when eventId is undefined', () => {
    const onCheckIn = vi.fn();
    renderHook(() => useAttendanceCheckInRealtime(undefined, { onCheckIn }));

    expect(mockSupabaseChannel).not.toHaveBeenCalled();
  });

  it('does not subscribe when realtime listening is disabled', () => {
    const onCheckIn = vi.fn();
    renderHook(() => useAttendanceCheckInRealtime('event-123', { onCheckIn, enabled: false }));

    expect(mockSupabaseChannel).not.toHaveBeenCalled();
  });

  it('subscribes to the correct channel when eventId is provided', () => {
    const onCheckIn = vi.fn();
    renderHook(() => useAttendanceCheckInRealtime('event-123', { onCheckIn }));

    expect(mockSupabaseChannel).toHaveBeenCalledWith('attendance-check-ins:event-123');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'attendance_check_ins',
        filter: 'event_id=eq.event-123',
      }),
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('calls onCheckIn with a valid registered-attendee check-in payload', () => {
    const onCheckIn = vi.fn();
    renderHook(() => useAttendanceCheckInRealtime('event-1', { onCheckIn }));

    const payloadHandler = mockOn.mock.calls[0][2] as (p: object) => void;

    payloadHandler({
      new: {
        event_id: 'event-1',
        attendee_kind: 'registered',
        registration_id: 'reg-001',
        public_registration_id: null,
        first_checked_in_at: '2026-07-22T08:00:00.000Z',
      },
    });

    expect(onCheckIn).toHaveBeenCalledWith({
      event_id: 'event-1',
      attendee_kind: 'registered',
      registration_id: 'reg-001',
      public_registration_id: null,
      first_checked_in_at: '2026-07-22T08:00:00.000Z',
    });
  });

  it('calls onCheckIn with a valid public-attendee check-in payload', () => {
    const onCheckIn = vi.fn();
    renderHook(() => useAttendanceCheckInRealtime('event-2', { onCheckIn }));

    const payloadHandler = mockOn.mock.calls[0][2] as (p: object) => void;

    payloadHandler({
      new: {
        event_id: 'event-2',
        attendee_kind: 'public',
        registration_id: null,
        public_registration_id: 'pub-001',
        first_checked_in_at: '2026-07-22T09:00:00.000Z',
      },
    });

    expect(onCheckIn).toHaveBeenCalledWith({
      event_id: 'event-2',
      attendee_kind: 'public',
      registration_id: null,
      public_registration_id: 'pub-001',
      first_checked_in_at: '2026-07-22T09:00:00.000Z',
    });
  });

  it('ignores payloads with an invalid attendee_kind', () => {
    const onCheckIn = vi.fn();
    renderHook(() => useAttendanceCheckInRealtime('event-1', { onCheckIn }));

    const payloadHandler = mockOn.mock.calls[0][2] as (p: object) => void;

    payloadHandler({
      new: {
        event_id: 'event-1',
        attendee_kind: 'unknown_kind',
        registration_id: 'reg-001',
        public_registration_id: null,
        first_checked_in_at: '2026-07-22T08:00:00.000Z',
      },
    });

    expect(onCheckIn).not.toHaveBeenCalled();
  });

  it('ignores payloads with a missing event_id', () => {
    const onCheckIn = vi.fn();
    renderHook(() => useAttendanceCheckInRealtime('event-1', { onCheckIn }));

    const payloadHandler = mockOn.mock.calls[0][2] as (p: object) => void;

    payloadHandler({
      new: {
        attendee_kind: 'registered',
        registration_id: 'reg-001',
        public_registration_id: null,
        first_checked_in_at: '2026-07-22T08:00:00.000Z',
      },
    });

    expect(onCheckIn).not.toHaveBeenCalled();
  });

  it('ignores payloads with a missing first_checked_in_at', () => {
    const onCheckIn = vi.fn();
    renderHook(() => useAttendanceCheckInRealtime('event-1', { onCheckIn }));

    const payloadHandler = mockOn.mock.calls[0][2] as (p: object) => void;

    payloadHandler({
      new: {
        event_id: 'event-1',
        attendee_kind: 'registered',
        registration_id: 'reg-001',
        public_registration_id: null,
      },
    });

    expect(onCheckIn).not.toHaveBeenCalled();
  });

  it('removes the channel on unmount', () => {
    const onCheckIn = vi.fn();
    const { unmount } = renderHook(() =>
      useAttendanceCheckInRealtime('event-cleanup', { onCheckIn }),
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('re-subscribes when eventId changes', () => {
    const onCheckIn = vi.fn();
    let eventId = 'event-A';

    const { rerender } = renderHook(() => useAttendanceCheckInRealtime(eventId, { onCheckIn }));

    expect(mockSupabaseChannel).toHaveBeenCalledWith('attendance-check-ins:event-A');

    eventId = 'event-B';
    rerender();

    expect(mockSupabaseChannel).toHaveBeenCalledWith('attendance-check-ins:event-B');
  });

  it('logs subscription errors without throwing', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onCheckIn = vi.fn();

    renderHook(() => useAttendanceCheckInRealtime('event-err', { onCheckIn }));

    const statusCallback = mockSubscribe.mock.calls[0][0] as (
      status: string,
      error?: Error,
    ) => void;
    statusCallback('CHANNEL_ERROR', new Error('connection failed'));

    expect(consoleError).toHaveBeenCalledWith(
      '[attendance-check-ins] realtime subscription issue',
      expect.objectContaining({ eventId: 'event-err', status: 'CHANNEL_ERROR' }),
    );

    consoleError.mockRestore();
  });
});
