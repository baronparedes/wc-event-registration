import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAttendanceSlotRecordRealtime } from '../useAttendanceSlotRecordRealtime';

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

describe('useAttendanceSlotRecordRealtime', () => {
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
    const onSlotRecord = vi.fn();

    renderHook(() => useAttendanceSlotRecordRealtime(undefined, { onSlotRecord }));

    expect(mockSupabaseChannel).not.toHaveBeenCalled();
  });

  it('does not subscribe when realtime listening is disabled', () => {
    const onSlotRecord = vi.fn();

    renderHook(() =>
      useAttendanceSlotRecordRealtime('event-123', { onSlotRecord, enabled: false }),
    );

    expect(mockSupabaseChannel).not.toHaveBeenCalled();
  });

  it('subscribes to the correct channel when eventId is provided', () => {
    const onSlotRecord = vi.fn();

    renderHook(() => useAttendanceSlotRecordRealtime('event-123', { onSlotRecord }));

    expect(mockSupabaseChannel).toHaveBeenCalledWith('attendance-slot-records:event-123');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'attendance_slot_records',
        filter: 'event_id=eq.event-123',
      }),
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('calls onSlotRecord with a valid payload', () => {
    const onSlotRecord = vi.fn();

    renderHook(() => useAttendanceSlotRecordRealtime('event-1', { onSlotRecord }));

    const payloadHandler = mockOn.mock.calls[0][2] as (payload: object) => void;

    payloadHandler({
      new: {
        event_id: 'event-1',
        check_in_id: 'check-in-1',
        slot: '9:00 AM',
        recorded_at: '2026-07-22T08:00:00.000Z',
      },
    });

    expect(onSlotRecord).toHaveBeenCalledWith({
      event_id: 'event-1',
      check_in_id: 'check-in-1',
      slot_record: {
        slot: '9:00 AM',
        recorded_at: '2026-07-22T08:00:00.000Z',
      },
    });
  });

  it('ignores payloads with a missing check_in_id', () => {
    const onSlotRecord = vi.fn();

    renderHook(() => useAttendanceSlotRecordRealtime('event-1', { onSlotRecord }));

    const payloadHandler = mockOn.mock.calls[0][2] as (payload: object) => void;

    payloadHandler({
      new: {
        event_id: 'event-1',
        slot: '9:00 AM',
        recorded_at: '2026-07-22T08:00:00.000Z',
      },
    });

    expect(onSlotRecord).not.toHaveBeenCalled();
  });

  it('ignores payloads with a non-string slot', () => {
    const onSlotRecord = vi.fn();

    renderHook(() => useAttendanceSlotRecordRealtime('event-1', { onSlotRecord }));

    const payloadHandler = mockOn.mock.calls[0][2] as (payload: object) => void;

    payloadHandler({
      new: {
        event_id: 'event-1',
        check_in_id: 'check-in-1',
        slot: 900,
        recorded_at: '2026-07-22T08:00:00.000Z',
      },
    });

    expect(onSlotRecord).not.toHaveBeenCalled();
  });

  it('removes the channel on unmount', () => {
    const onSlotRecord = vi.fn();
    const { unmount } = renderHook(() =>
      useAttendanceSlotRecordRealtime('event-cleanup', { onSlotRecord }),
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('re-subscribes when eventId changes', () => {
    const onSlotRecord = vi.fn();
    let eventId = 'event-A';

    const { rerender } = renderHook(() =>
      useAttendanceSlotRecordRealtime(eventId, { onSlotRecord }),
    );

    expect(mockSupabaseChannel).toHaveBeenCalledWith('attendance-slot-records:event-A');

    eventId = 'event-B';
    rerender();

    expect(mockSupabaseChannel).toHaveBeenCalledWith('attendance-slot-records:event-B');
  });
});
