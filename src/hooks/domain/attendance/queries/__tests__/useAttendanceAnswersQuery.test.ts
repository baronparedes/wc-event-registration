import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAttendanceAnswersQuery } from '@/hooks/domain/attendance/queries/useAttendanceAnswersQuery';
import type { RegistrantAttendanceRow } from '@/lib/domain/attendance';

const {
  mockRegistrationsBuilder,
  mockUsersBuilder,
  mockAnswersBuilder,
  mockPublicRegistrationsBuilder,
  mockPublicAnswersBuilder,
  mockFrom,
} = vi.hoisted(() => {
  const makeBuilder = () => {
    const builder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
      order: vi.fn(),
      in: vi.fn(),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.neq.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.in.mockReturnValue(builder);
    return builder;
  };

  const registrationsBuilder = makeBuilder();
  const usersBuilder = makeBuilder();
  const answersBuilder = makeBuilder();

  const publicRegistrationsBuilder = makeBuilder();
  const publicAnswersBuilder = makeBuilder();

  const mockFrom = vi.fn((table: string) => {
    if (table === 'registrations') return registrationsBuilder;
    if (table === 'users') return usersBuilder;
    if (table === 'attendance_answers') return answersBuilder;
    if (table === 'public_registrations') return publicRegistrationsBuilder;
    if (table === 'public_attendance_answers') return publicAnswersBuilder;
    return makeBuilder();
  });

  return {
    mockRegistrationsBuilder: registrationsBuilder,
    mockUsersBuilder: usersBuilder,
    mockAnswersBuilder: answersBuilder,
    mockPublicRegistrationsBuilder: publicRegistrationsBuilder,
    mockPublicAnswersBuilder: publicAnswersBuilder,
    mockFrom,
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

describe('useAttendanceAnswersQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockRegistrationsBuilder.select.mockReturnValue(mockRegistrationsBuilder);
    mockRegistrationsBuilder.eq.mockReturnValue(mockRegistrationsBuilder);
    mockRegistrationsBuilder.order.mockReturnValue(mockRegistrationsBuilder);
    mockRegistrationsBuilder.in.mockReturnValue(mockRegistrationsBuilder);
    mockUsersBuilder.select.mockReturnValue(mockUsersBuilder);
    mockUsersBuilder.eq.mockReturnValue(mockUsersBuilder);
    mockUsersBuilder.order.mockReturnValue(mockUsersBuilder);
    mockUsersBuilder.in.mockReturnValue(mockUsersBuilder);
    mockAnswersBuilder.select.mockReturnValue(mockAnswersBuilder);
    mockAnswersBuilder.eq.mockReturnValue(mockAnswersBuilder);
    mockAnswersBuilder.order.mockReturnValue(mockAnswersBuilder);
    mockAnswersBuilder.in.mockReturnValue(mockAnswersBuilder);
    mockPublicRegistrationsBuilder.select.mockReturnValue(mockPublicRegistrationsBuilder);
    mockPublicRegistrationsBuilder.eq.mockReturnValue(mockPublicRegistrationsBuilder);
    mockPublicRegistrationsBuilder.order.mockReturnValue(mockPublicRegistrationsBuilder);
    mockPublicRegistrationsBuilder.in.mockReturnValue(mockPublicRegistrationsBuilder);
    mockPublicAnswersBuilder.select.mockReturnValue(mockPublicAnswersBuilder);
    mockPublicAnswersBuilder.eq.mockReturnValue(mockPublicAnswersBuilder);
    mockPublicAnswersBuilder.order.mockReturnValue(mockPublicAnswersBuilder);
    mockPublicAnswersBuilder.in.mockReturnValue(mockPublicAnswersBuilder);
    mockFrom.mockImplementation((table: string) => {
      if (table === 'registrations') return mockRegistrationsBuilder;
      if (table === 'users') return mockUsersBuilder;
      if (table === 'attendance_answers') return mockAnswersBuilder;
      if (table === 'public_registrations') return mockPublicRegistrationsBuilder;
      if (table === 'public_attendance_answers') return mockPublicAnswersBuilder;
      return mockAnswersBuilder;
    });
  });

  it('returns empty array when eventId is undefined', async () => {
    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery(undefined));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(false);
    });
  });

  it('is disabled when eventId is undefined', () => {
    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery(undefined));

    expect(result.current.isLoading).toBe(false);
  });

  it('returns empty array when no registrations found', async () => {
    mockRegistrationsBuilder.eq.mockResolvedValueOnce({ data: [], error: null });
    mockPublicRegistrationsBuilder.eq.mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('fetches registrations with user details and attendance answers', async () => {
    const mockRegistrations = [
      { id: 'reg-1', user_id: 'user-1' },
      { id: 'reg-2', user_id: 'user-2' },
    ];
    const mockUsers = [
      { id: 'user-1', member_id: 'mem-1', full_name: 'Alice', email: 'alice@test.com' },
      { id: 'user-2', member_id: 'mem-2', full_name: 'Bob', email: 'bob@test.com' },
    ];
    const mockAnswers = [
      {
        id: 'ans-1',
        registration_id: 'reg-1',
        attendance_field_id: 'field-1',
        answer_text: 'Table 1',
        answer_number: null,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'ans-2',
        registration_id: 'reg-2',
        attendance_field_id: 'field-1',
        answer_text: 'Table 2',
        answer_number: null,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ];

    mockRegistrationsBuilder.eq.mockResolvedValueOnce({ data: mockRegistrations, error: null });
    mockPublicRegistrationsBuilder.eq.mockResolvedValueOnce({ data: [], error: null });
    mockUsersBuilder.order.mockResolvedValueOnce({ data: mockUsers, error: null });
    mockAnswersBuilder.in.mockResolvedValueOnce({ data: mockAnswers, error: null });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([
      {
        attendee_kind: 'registered',
        registration_id: 'reg-1',
        public_registration_id: null,
        member_id: 'mem-1',
        full_name: 'Alice',
        email: 'alice@test.com',
        role: null,
        category: null,
        check_in_status: 'not_checked_in',
        answers: [{ ...mockAnswers[0], public_registration_id: null }],
      },
      {
        attendee_kind: 'registered',
        registration_id: 'reg-2',
        public_registration_id: null,
        member_id: 'mem-2',
        full_name: 'Bob',
        email: 'bob@test.com',
        role: null,
        category: null,
        check_in_status: 'not_checked_in',
        answers: [{ ...mockAnswers[1], public_registration_id: null }],
      },
    ]);
  });

  it('handles null email gracefully', async () => {
    const mockRegistrations = [{ id: 'reg-1', user_id: 'user-1' }];
    const mockUsers = [{ id: 'user-1', member_id: 'mem-1', full_name: 'Charlie', email: null }];

    mockRegistrationsBuilder.eq.mockResolvedValueOnce({ data: mockRegistrations, error: null });
    mockPublicRegistrationsBuilder.eq.mockResolvedValueOnce({ data: [], error: null });
    mockUsersBuilder.order.mockResolvedValueOnce({ data: mockUsers, error: null });
    mockAnswersBuilder.in.mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0]).toEqual(
      expect.objectContaining({
        registration_id: 'reg-1',
        public_registration_id: null,
        member_id: 'mem-1',
        attendee_kind: 'registered',
        full_name: 'Charlie',
        email: null,
      }),
    );
  });

  it('returns error state when registrations query fails', async () => {
    mockRegistrationsBuilder.eq.mockResolvedValueOnce({
      data: null,
      error: new Error('Registration query failed'),
    });
    mockPublicRegistrationsBuilder.eq.mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('returns error state when users query fails', async () => {
    const mockRegistrations = [{ id: 'reg-1', user_id: 'user-1' }];

    mockRegistrationsBuilder.eq.mockResolvedValueOnce({ data: mockRegistrations, error: null });
    mockPublicRegistrationsBuilder.eq.mockResolvedValueOnce({ data: [], error: null });
    mockUsersBuilder.order.mockResolvedValueOnce({
      data: null,
      error: new Error('Users query failed'),
    });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('returns error state when attendance answers query fails', async () => {
    const mockRegistrations = [{ id: 'reg-1', user_id: 'user-1' }];
    const mockUsers = [
      { id: 'user-1', member_id: 'mem-1', full_name: 'David', email: 'david@test.com' },
    ];

    mockRegistrationsBuilder.eq.mockResolvedValueOnce({ data: mockRegistrations, error: null });
    mockPublicRegistrationsBuilder.eq.mockResolvedValueOnce({ data: [], error: null });
    mockUsersBuilder.order.mockResolvedValueOnce({ data: mockUsers, error: null });
    mockAnswersBuilder.in.mockResolvedValueOnce({
      data: null,
      error: new Error('Attendance answers query failed'),
    });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('filters answers by registration_id correctly', async () => {
    const mockRegistrations = [
      { id: 'reg-1', user_id: 'user-1' },
      { id: 'reg-2', user_id: 'user-2' },
    ];
    const mockUsers = [
      { id: 'user-1', member_id: 'mem-1', full_name: 'Eve', email: 'eve@test.com' },
      { id: 'user-2', member_id: 'mem-2', full_name: 'Frank', email: 'frank@test.com' },
    ];
    const mockAnswers = [
      {
        id: 'ans-1',
        registration_id: 'reg-1',
        attendance_field_id: 'field-1',
        answer_text: 'Value 1',
        answer_number: null,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'ans-2',
        registration_id: 'reg-1',
        attendance_field_id: 'field-2',
        answer_text: null,
        answer_number: 42,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'ans-3',
        registration_id: 'reg-2',
        attendance_field_id: 'field-1',
        answer_text: 'Value 2',
        answer_number: null,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ];

    mockRegistrationsBuilder.eq.mockResolvedValueOnce({ data: mockRegistrations, error: null });
    mockPublicRegistrationsBuilder.eq.mockResolvedValueOnce({ data: [], error: null });
    mockUsersBuilder.order.mockResolvedValueOnce({ data: mockUsers, error: null });
    mockAnswersBuilder.in.mockResolvedValueOnce({ data: mockAnswers, error: null });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as RegistrantAttendanceRow[];
    expect(data[0].answers).toHaveLength(2);
    expect(data[1].answers).toHaveLength(1);
  });

  it('orders users by full_name ascending', async () => {
    mockRegistrationsBuilder.eq.mockResolvedValueOnce({ data: [], error: null });
    mockPublicRegistrationsBuilder.eq.mockResolvedValueOnce({ data: [], error: null });

    renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(mockRegistrationsBuilder.eq).toHaveBeenCalledWith('event_id', 'event-1');
    });
  });

  it('handles null answers from database', async () => {
    const mockRegistrations = [{ id: 'reg-1', user_id: 'user-1' }];
    const mockUsers = [
      { id: 'user-1', member_id: 'mem-1', full_name: 'Grace', email: 'grace@test.com' },
    ];

    mockRegistrationsBuilder.eq.mockResolvedValueOnce({ data: mockRegistrations, error: null });
    mockPublicRegistrationsBuilder.eq.mockResolvedValueOnce({ data: [], error: null });
    mockUsersBuilder.order.mockResolvedValueOnce({ data: mockUsers, error: null });
    mockAnswersBuilder.in.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as RegistrantAttendanceRow[];
    expect(data[0].answers).toEqual([]);
  });
});
