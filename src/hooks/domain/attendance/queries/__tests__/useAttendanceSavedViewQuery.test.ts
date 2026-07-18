import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAttendanceSavedViewQuery } from '@/hooks/domain/attendance/queries/useAttendanceSavedViewQuery';
import type { AttendanceSavedView } from '@/lib/domain/attendance-views';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.single.mockReturnValue(queryBuilder);

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
  name: 'Checked In',
  view_config: {
    nameOrMemberQuery: '',
    role: [],
    category: 'all',
    checkInStatus: 'checked_in',
    dynamicFilters: [],
    groupBy: [],
  },
  created_at: '2026-07-19T00:00:00.000Z',
  updated_at: '2026-07-19T00:00:00.000Z',
};

describe('useAttendanceSavedViewQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.single.mockReturnValue(mockQueryBuilder);
  });

  it('is disabled and returns undefined when viewId is undefined', () => {
    const { result } = renderHookWithClient(() => useAttendanceSavedViewQuery(undefined));

    expect(result.current.data).toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('queries attendance_saved_views table by id', () => {
    mockQueryBuilder.single.mockResolvedValueOnce({ data: mockView, error: null });

    renderHookWithClient(() => useAttendanceSavedViewQuery('view-1'));

    expect(mockFrom).toHaveBeenCalledWith('attendance_saved_views');
    expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'view-1');
    expect(mockQueryBuilder.single).toHaveBeenCalled();
  });

  it('returns the saved view on success', async () => {
    mockQueryBuilder.single.mockResolvedValueOnce({ data: mockView, error: null });

    const { result } = renderHookWithClient(() =>
      useAttendanceSavedViewQuery('00000000-0000-0000-0000-000000000001'),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockView);
  });

  it('enters error state when supabase returns an error', async () => {
    mockQueryBuilder.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    });

    const { result } = renderHookWithClient(() => useAttendanceSavedViewQuery('view-1'));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
