import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useEnqueueOfflineCheckInMutation } from '@/hooks/domain/attendance/mutations/useEnqueueOfflineCheckInMutation';

const { mockEnqueueOfflineCheckIn } = vi.hoisted(() => ({
  mockEnqueueOfflineCheckIn: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return { ...actual, enqueueOfflineCheckIn: mockEnqueueOfflineCheckIn };
});

describe('useEnqueueOfflineCheckInMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueueOfflineCheckIn.mockResolvedValue(undefined);
  });

  it('atomically queues an optimistic attendee update for the prepared owner', async () => {
    const { result } = renderHookWithClient(() => useEnqueueOfflineCheckInMutation());

    await act(async () => {
      await result.current.mutateAsync({
        owner: { userId: 'user-1', role: 'kiosk' },
        payload: {
          event_id: 'event-1',
          attendee_kind: 'registered',
          registration_id: 'registration-1',
        },
        registrationId: 'registration-1',
        attendees: [
          {
            attendee_kind: 'registered',
            registration_id: 'registration-1',
            public_registration_id: null,
            user_id: 'member-1',
            member_id: 'MEMBER-1',
            nickname: 'Ada',
            last_name: 'Lovelace',
            full_name: 'Ada Lovelace',
            email: null,
            role: null,
            category: null,
            registration_status: 'submitted',
            submitted_at: '2026-08-01T00:00:00.000Z',
            check_in_status: 'not_checked_in',
            official_check_in_time: null,
            registration_answers: [],
            attendance_answers: [],
          },
        ],
      });
    });

    expect(mockEnqueueOfflineCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'event-1',
        ownerUserId: 'user-1',
        registrationId: 'registration-1',
        status: 'pending',
      }),
      [
        expect.objectContaining({
          check_in_status: 'checked_in',
          official_check_in_time: expect.any(String),
        }),
      ],
    );
  });
});
