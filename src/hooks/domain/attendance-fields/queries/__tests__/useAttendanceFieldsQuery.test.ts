import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAttendanceFieldsQuery } from '@/hooks/domain/attendance-fields/queries/useAttendanceFieldsQuery';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);

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

describe('useAttendanceFieldsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const qb = mockQueryBuilder;
    qb.select.mockReturnValue(qb);
    qb.eq.mockReturnValue(qb);
    qb.order.mockReturnValue(qb);
  });

  it('returns undefined when eventId is undefined', () => {
    const { result } = renderHookWithClient(() => useAttendanceFieldsQuery(undefined));

    expect(result.current.data).toBeUndefined();
    expect(mockQueryBuilder.select).not.toHaveBeenCalled();
  });

  it('selects specific columns when eventId is provided', () => {
    mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    renderHookWithClient(() => useAttendanceFieldsQuery('event-1'));

    expect(mockQueryBuilder.select).toHaveBeenCalledWith(
      'id, event_id, field_key, label, field_type, is_required, is_active, display_order, options, validation_rules, created_at, updated_at',
    );
  });

  it('filters by event_id', () => {
    mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    renderHookWithClient(() => useAttendanceFieldsQuery('event-xyz'));

    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('event_id', 'event-xyz');
  });

  it('orders by display_order then created_at ascending', () => {
    const resolvedValue = { data: [], error: null };
    mockQueryBuilder.order
      .mockReturnValueOnce(mockQueryBuilder)
      .mockResolvedValueOnce(resolvedValue);

    renderHookWithClient(() => useAttendanceFieldsQuery('event-1'));

    expect(mockQueryBuilder.order).toHaveBeenCalledWith('display_order', { ascending: true });
    expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('calls from() for attendance_fields table', () => {
    mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    renderHookWithClient(() => useAttendanceFieldsQuery('event-1'));

    expect(mockFrom).toHaveBeenCalledWith('attendance_fields');
  });

  it('disables query when eventId is undefined', () => {
    const { result } = renderHookWithClient(() => useAttendanceFieldsQuery(undefined));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('throws error when Supabase returns an error', async () => {
    const testError = new Error('Supabase error');
    mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: testError,
    });

    const { result } = renderHookWithClient(() => useAttendanceFieldsQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('returns empty array when data is null', async () => {
    mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHookWithClient(() => useAttendanceFieldsQuery('event-1'));

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('returns attendance fields when data is provided', async () => {
    const mockFields = [
      {
        id: 'field-1',
        event_id: 'event-1',
        field_key: 'table',
        label: 'Table Number',
        field_type: 'number',
        is_required: true,
        is_active: true,
        display_order: 0,
        options: [],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ];

    mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: mockFields,
      error: null,
    });

    const { result } = renderHookWithClient(() => useAttendanceFieldsQuery('event-1'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockFields);
    });
  });
});
