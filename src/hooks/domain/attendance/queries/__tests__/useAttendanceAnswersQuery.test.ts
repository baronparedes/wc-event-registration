import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAttendanceAnswersQuery } from '@/hooks/domain/attendance/queries/useAttendanceAnswersQuery';
import type { RegistrantAttendanceRow } from '@/lib/domain/attendance';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    in: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.in.mockReturnValue(queryBuilder);

  return {
    mockQueryBuilder: queryBuilder,
    mockFrom: vi.fn(() => queryBuilder),
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
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.in.mockReturnValue(mockQueryBuilder);
  });

  it('returns empty array when eventId is undefined', async () => {
    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery(undefined));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(false);
    });
  });

  it('returns empty array when no registrations found', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('fetches registrations and their attendance answers', async () => {
    const mockRegistrations = [
      { id: 'reg-1', member_id: 'mem-1', full_name: 'Alice', email: 'alice@test.com' },
      { id: 'reg-2', member_id: 'mem-2', full_name: 'Bob', email: 'bob@test.com' },
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

    mockQueryBuilder.order.mockResolvedValueOnce({
      data: mockRegistrations,
      error: null,
    });

    mockQueryBuilder.in.mockResolvedValueOnce({
      data: mockAnswers,
      error: null,
    });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([
      {
        registration_id: 'reg-1',
        member_id: 'mem-1',
        full_name: 'Alice',
        email: 'alice@test.com',
        answers: [mockAnswers[0]],
      },
      {
        registration_id: 'reg-2',
        member_id: 'mem-2',
        full_name: 'Bob',
        email: 'bob@test.com',
        answers: [mockAnswers[1]],
      },
    ]);
  });

  it('handles null email gracefully', async () => {
    const mockRegistrations = [
      { id: 'reg-1', member_id: 'mem-1', full_name: 'Charlie', email: null },
    ];

    mockQueryBuilder.order.mockResolvedValueOnce({
      data: mockRegistrations,
      error: null,
    });

    mockQueryBuilder.in.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0]).toEqual(
      expect.objectContaining({
        registration_id: 'reg-1',
        member_id: 'mem-1',
        full_name: 'Charlie',
        email: null,
      }),
    );
  });

  it('returns an error state when registration query fails', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({
      data: null,
      error: new Error('Registration query failed'),
    });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('returns an error state when attendance answers query fails', async () => {
    const mockRegistrations = [
      { id: 'reg-1', member_id: 'mem-1', full_name: 'David', email: 'david@test.com' },
    ];

    mockQueryBuilder.order.mockResolvedValueOnce({
      data: mockRegistrations,
      error: null,
    });

    mockQueryBuilder.in.mockResolvedValueOnce({
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
      { id: 'reg-1', member_id: 'mem-1', full_name: 'Eve', email: 'eve@test.com' },
      { id: 'reg-2', member_id: 'mem-2', full_name: 'Frank', email: 'frank@test.com' },
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

    mockQueryBuilder.order.mockResolvedValueOnce({
      data: mockRegistrations,
      error: null,
    });

    mockQueryBuilder.in.mockResolvedValueOnce({
      data: mockAnswers,
      error: null,
    });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as RegistrantAttendanceRow[];
    expect(data[0].answers).toHaveLength(2);
    expect(data[1].answers).toHaveLength(1);
  });

  it('is disabled when eventId is undefined', () => {
    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery(undefined));

    expect(result.current.isLoading).toBe(false);
  });

  it('orders registrations by full_name ascending', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('full_name', { ascending: true });
    });
  });

  it('filters for registered status only', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'registered');
    });
  });

  it('handles empty answers array from database', async () => {
    const mockRegistrations = [
      { id: 'reg-1', member_id: 'mem-1', full_name: 'Grace', email: 'grace@test.com' },
    ];

    mockQueryBuilder.order.mockResolvedValueOnce({
      data: mockRegistrations,
      error: null,
    });

    mockQueryBuilder.in.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHookWithClient(() => useAttendanceAnswersQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as RegistrantAttendanceRow[];
    expect(data[0].answers).toEqual([]);
  });
});
