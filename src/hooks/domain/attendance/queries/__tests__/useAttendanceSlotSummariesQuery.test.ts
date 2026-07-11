import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAttendanceSlotSummariesQuery } from '@/hooks/domain/attendance/queries/useAttendanceSlotSummariesQuery';

const {
  mockSlotRecordsBuilder,
  mockCheckInsBuilder,
  mockRegistrationsBuilder,
  mockUsersBuilder,
  mockPublicRegistrationsBuilder,
  mockFrom,
} = vi.hoisted(() => {
  const makeBuilder = () => {
    const builder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      in: vi.fn(),
    };

    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.in.mockReturnValue(builder);

    return builder;
  };

  const slotRecordsBuilder = makeBuilder();
  const checkInsBuilder = makeBuilder();
  const registrationsBuilder = makeBuilder();
  const usersBuilder = makeBuilder();
  const publicRegistrationsBuilder = makeBuilder();

  const from = vi.fn((table: string) => {
    if (table === 'attendance_slot_records') return slotRecordsBuilder;
    if (table === 'attendance_check_ins') return checkInsBuilder;
    if (table === 'registrations') return registrationsBuilder;
    if (table === 'users') return usersBuilder;
    if (table === 'public_registrations') return publicRegistrationsBuilder;
    return makeBuilder();
  });

  return {
    mockSlotRecordsBuilder: slotRecordsBuilder,
    mockCheckInsBuilder: checkInsBuilder,
    mockRegistrationsBuilder: registrationsBuilder,
    mockUsersBuilder: usersBuilder,
    mockPublicRegistrationsBuilder: publicRegistrationsBuilder,
    mockFrom: from,
  };
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

describe('useAttendanceSlotSummariesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSlotRecordsBuilder.select.mockReturnValue(mockSlotRecordsBuilder);
    mockSlotRecordsBuilder.eq.mockReturnValue(mockSlotRecordsBuilder);
    mockSlotRecordsBuilder.order.mockReturnValue(mockSlotRecordsBuilder);

    mockCheckInsBuilder.select.mockReturnValue(mockCheckInsBuilder);
    mockCheckInsBuilder.in.mockReturnValue(mockCheckInsBuilder);

    mockRegistrationsBuilder.select.mockReturnValue(mockRegistrationsBuilder);
    mockRegistrationsBuilder.in.mockReturnValue(mockRegistrationsBuilder);

    mockUsersBuilder.select.mockReturnValue(mockUsersBuilder);
    mockUsersBuilder.in.mockReturnValue(mockUsersBuilder);

    mockPublicRegistrationsBuilder.select.mockReturnValue(mockPublicRegistrationsBuilder);
    mockPublicRegistrationsBuilder.in.mockReturnValue(mockPublicRegistrationsBuilder);
  });

  it('stays idle when event ID is missing', () => {
    const { result } = renderHookWithClient(() => useAttendanceSlotSummariesQuery(undefined));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns grouped slot summaries for registered and public attendees', async () => {
    mockSlotRecordsBuilder.order.mockResolvedValueOnce({
      data: [
        {
          check_in_id: 'check-in-1',
          slot: '2026-07-11T09:00:00+08:00',
          recorded_at: '2026-07-11T01:01:00.000Z',
        },
        {
          check_in_id: 'check-in-2',
          slot: '2026-07-11T12:00:00+08:00',
          recorded_at: '2026-07-11T01:02:00.000Z',
        },
      ],
      error: null,
    });

    mockCheckInsBuilder.in.mockResolvedValueOnce({
      data: [
        {
          id: 'check-in-1',
          attendee_kind: 'registered',
          registration_id: 'reg-1',
          public_registration_id: null,
          first_checked_in_at: '2026-07-11T01:00:00.000Z',
        },
        {
          id: 'check-in-2',
          attendee_kind: 'public',
          registration_id: null,
          public_registration_id: 'pub-1',
          first_checked_in_at: '2026-07-11T01:00:30.000Z',
        },
      ],
      error: null,
    });

    mockRegistrationsBuilder.in.mockResolvedValueOnce({
      data: [{ id: 'reg-1', user_id: 'user-1' }],
      error: null,
    });

    mockUsersBuilder.in.mockResolvedValueOnce({
      data: [
        {
          id: 'user-1',
          member_id: 'MID-001',
          full_name: 'Registered Person',
          email: 'registered@test.com',
        },
      ],
      error: null,
    });

    mockPublicRegistrationsBuilder.in.mockResolvedValueOnce({
      data: [
        {
          id: 'pub-1',
          first_name: 'Public',
          last_name: 'Attendee',
          email: 'public@test.com',
        },
      ],
      error: null,
    });

    const { result } = renderHookWithClient(() => useAttendanceSlotSummariesQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([
      {
        slot: '2026-07-11T09:00:00+08:00',
        count: 1,
        attendees: [
          {
            check_in_id: 'check-in-1',
            attendee_kind: 'registered',
            registration_id: 'reg-1',
            public_registration_id: null,
            full_name: 'Registered Person',
            member_id: 'MID-001',
            email: 'registered@test.com',
            official_check_in_time: '2026-07-11T01:00:00.000Z',
            recorded_at: '2026-07-11T01:01:00.000Z',
          },
        ],
      },
      {
        slot: '2026-07-11T12:00:00+08:00',
        count: 1,
        attendees: [
          {
            check_in_id: 'check-in-2',
            attendee_kind: 'public',
            registration_id: null,
            public_registration_id: 'pub-1',
            full_name: 'Public Attendee',
            member_id: null,
            email: 'public@test.com',
            official_check_in_time: '2026-07-11T01:00:30.000Z',
            recorded_at: '2026-07-11T01:02:00.000Z',
          },
        ],
      },
    ]);
  });
});
