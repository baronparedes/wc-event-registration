import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAttendanceSavedViewsQuery } from '@/hooks/domain/attendance/queries/useAttendanceSavedViewsQuery';
import type { AttendanceSavedView } from '@/lib/domain/attendance-views';

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

vi.mock('@/lib/infrastructure/supabase', async () => {
  const actual = await vi.importActual<typeof import('@/lib/infrastructure/supabase')>(
    '@/lib/infrastructure/supabase',
  );
  return {
    ...actual,
    supabase: { from: mockFrom },
  };
});

const mockView: AttendanceSavedView = {
  id: '00000000-0000-0000-0000-000000000001',
  event_id: '00000000-0000-0000-0000-000000000002',
  name: 'All Members',
  view_config: {
    nameOrMemberQuery: '',
    role: [],
    category: 'all',
    checkInStatus: 'all',
    dynamicFilters: [],
    groupBy: [],
    visibleFields: [],
  },
  created_at: '2026-07-19T00:00:00.000Z',
  updated_at: '2026-07-19T00:00:00.000Z',
};

describe('useAttendanceSavedViewsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
  });

  it('is disabled and returns undefined when eventId is undefined', () => {
    const { result } = renderHookWithClient(() => useAttendanceSavedViewsQuery(undefined));

    expect(result.current.data).toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('queries attendance_saved_views table filtered by event_id', () => {
    mockQueryBuilder.order.mockResolvedValueOnce({ data: [], error: null });

    renderHookWithClient(() => useAttendanceSavedViewsQuery('event-1'));

    expect(mockFrom).toHaveBeenCalledWith('attendance_saved_views');
    expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('event_id', 'event-1');
    expect(mockQueryBuilder.order).toHaveBeenCalledWith('name', { ascending: true });
  });

  it('returns saved views on success', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({ data: [mockView], error: null });

    const { result } = renderHookWithClient(() => useAttendanceSavedViewsQuery('event-1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockView]);
  });

  it('returns empty array when data is null', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useAttendanceSavedViewsQuery('event-1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('enters error state when supabase returns an error', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const { result } = renderHookWithClient(() => useAttendanceSavedViewsQuery('event-1'));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
