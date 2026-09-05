import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSelectedAttendanceView } from '../useSelectedAttendanceView';

describe('useSelectedAttendanceView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('handles apply view config, stored view redirect, and clearing view', () => {
    const navigate = vi.fn();
    const applyViewConfig = vi.fn();
    const clearViewControls = vi.fn();

    const searchParams = new URLSearchParams();

    const { result } = renderHook(() =>
      useSelectedAttendanceView({
        eventId: 'e1',
        viewIdParam: 'v1',
        savedView: {
          id: 'v1',
          event_id: 'e1',
          name: 'Saved View 1',
          view_config: {
            nameOrMemberQuery: '',
            role: [],
            category: 'all',
            checkInStatus: 'all',
            dynamicFilterCombination: 'and',
            dynamicFilters: [],
            groupBy: [],
            visibleFields: [],
          },
          sort_order: 1,
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
        searchParams,
        navigate,
        applyViewConfig,
        clearViewControls,
      }),
    );

    expect(applyViewConfig).toHaveBeenCalled();

    act(() => {
      result.current.handleClearView();
    });

    expect(clearViewControls).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ search: '' }, { replace: true });
  });

  it('restores stored viewId from localStorage when no viewId param is present', () => {
    localStorage.setItem('wc:attendance-data:selected-view:e1', 'v100');

    const navigate = vi.fn();
    const applyViewConfig = vi.fn();
    const clearViewControls = vi.fn();

    renderHook(() =>
      useSelectedAttendanceView({
        eventId: 'e1',
        viewIdParam: null,
        searchParams: new URLSearchParams(),
        navigate,
        applyViewConfig,
        clearViewControls,
      }),
    );

    expect(navigate).toHaveBeenCalledWith({ search: '?viewId=v100' }, { replace: true });
  });
});
