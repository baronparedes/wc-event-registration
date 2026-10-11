import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { fetchServiceDashboardStats } from '@/lib/domain/services';

import { useServiceDashboardQuery } from '../useServiceDashboardQuery';

vi.mock('@/lib/domain/services', () => ({ fetchServiceDashboardStats: vi.fn() }));

describe('useServiceDashboardQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('normalizes alternate slot names and fills absent slots for a monthly request', async () => {
    vi.mocked(fetchServiceDashboardStats).mockResolvedValue({
      time_slots: {
        '9:00 AM': {
          committed: 5,
          present: 4,
          walk_ins: 1,
          late_tardy: 0,
          roles: {},
          committed_roles: { Usher: 5 },
        },
      },
      roles: ['Usher'],
      committed_roles: ['Usher'],
    });
    const { result } = renderHookWithClient(() =>
      useServiceDashboardQuery({ year: 2026, month: 3 }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchServiceDashboardStats).toHaveBeenCalledWith({ p_year: 2026, p_month: 3 });
    expect(result.current.data?.time_slots['9AM'].present).toBe(4);
    expect(result.current.data?.time_slots['9AM'].committed_roles).toEqual({ Usher: 5 });
    expect(result.current.data?.time_slots['12NN'].present).toBe(0);
    expect(result.current.data?.time_slots['12NN'].committed_roles).toEqual({});
    expect(result.current.data?.roles).toEqual(['Usher']);
    expect(result.current.data?.committed_roles).toEqual(['Usher']);
  });

  it('prioritizes a selected Sunday and normalizes an empty response', async () => {
    vi.mocked(fetchServiceDashboardStats).mockResolvedValue(null);
    const { result } = renderHookWithClient(() =>
      useServiceDashboardQuery({ year: 2026, sunday_date: '2026-03-15' }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchServiceDashboardStats).toHaveBeenCalledWith({ p_sunday_date: '2026-03-15' });
    expect(result.current.data?.time_slots['3PM'].committed).toBe(0);
    expect(result.current.data?.time_slots['3PM'].committed_roles).toEqual({});
    expect(result.current.data?.roles).toEqual([]);
    expect(result.current.data?.committed_roles).toEqual([]);
  });

  it('does not request stats with no date and exposes request errors', async () => {
    const empty = renderHookWithClient(() => useServiceDashboardQuery({}));
    expect(empty.result.current.fetchStatus).toBe('idle');
    expect(fetchServiceDashboardStats).not.toHaveBeenCalled();
    empty.unmount();

    vi.mocked(fetchServiceDashboardStats).mockRejectedValue(new Error('Stats unavailable'));
    const failed = renderHookWithClient(() => useServiceDashboardQuery({ year: 2026 }));
    await waitFor(() => expect(failed.result.current.isError).toBe(true));
    expect(failed.result.current.error).toHaveProperty('message', 'Stats unavailable');
    expect(fetchServiceDashboardStats).toHaveBeenCalledWith({ p_year: 2026 });
  });
});
