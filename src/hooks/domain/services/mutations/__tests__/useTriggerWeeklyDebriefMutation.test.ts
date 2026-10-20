import { describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import {
  SERVICE_WEEKLY_BRIEFS_QUERY_KEY,
  useTriggerWeeklyDebriefMutation,
} from '@/hooks/domain/services';
import { triggerWeeklySundayDebrief } from '@/lib/domain/services';

vi.mock('@/lib/domain/services', () => ({
  triggerWeeklySundayDebrief: vi.fn(),
}));

describe('useTriggerWeeklyDebriefMutation', () => {
  it('calls triggerWeeklySundayDebrief and invalidates weekly debrief queries on success', async () => {
    const mockResponse = {
      success: true,
      brief: {
        id: 'brief-123',
        sunday_date: '2026-10-18',
        turnup_rate: 94.2,
        total_committed: 75,
        total_present: 71,
        total_walk_ins: 5,
        peak_slot: '9AM',
        summary: 'Debrief summary',
        key_highlights: ['Peak 9AM'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      metrics: {
        sundayDate: '2026-10-18',
        turnupRate: 94.2,
        peakSlot: '9AM',
        totalCommitted: 75,
        totalPresent: 71,
        totalWalkIns: 5,
      },
    };

    vi.mocked(triggerWeeklySundayDebrief).mockResolvedValue(mockResponse);

    const { result, queryClient } = renderHookWithClient(() => useTriggerWeeklyDebriefMutation());

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

    await result.current.mutateAsync({ sunday_date: '2026-10-18', force: true });

    expect(triggerWeeklySundayDebrief).toHaveBeenCalledWith({
      sunday_date: '2026-10-18',
      force: true,
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: SERVICE_WEEKLY_BRIEFS_QUERY_KEY,
    });
    expect(setQueryDataSpy).toHaveBeenCalledWith(
      [...SERVICE_WEEKLY_BRIEFS_QUERY_KEY, 'by-date', '2026-10-18'],
      mockResponse.brief,
    );
  });

  it('handles failure without invalidating queries', async () => {
    vi.mocked(triggerWeeklySundayDebrief).mockRejectedValue(new Error('Generation failed'));

    const { result, queryClient } = renderHookWithClient(() => useTriggerWeeklyDebriefMutation());

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await expect(result.current.mutateAsync({ sunday_date: '2026-10-18' })).rejects.toThrow(
      'Generation failed',
    );

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
