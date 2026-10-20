import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import {
  useServiceWeeklyBriefByDateQuery,
  useServiceWeeklyBriefsQuery,
} from '@/hooks/domain/services';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

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

describe('useServiceWeeklyBriefQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches service weekly brief by date successfully', async () => {
    const mockBrief = {
      id: 'brief-1',
      sunday_date: '2026-10-18',
      turnup_rate: 92.5,
      total_committed: 80,
      total_present: 74,
      total_walk_ins: 6,
      peak_slot: '9AM',
      summary: 'Paragraph 1\n\nParagraph 2\n\nParagraph 3',
      key_highlights: ['92.5% Turn-up', 'Peak 9AM'],
      created_at: '2026-10-19T00:00:00Z',
      updated_at: '2026-10-19T00:00:00Z',
    };

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockBrief, error: null });

    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });

    const { result } = renderHookWithClient(() => useServiceWeeklyBriefByDateQuery('2026-10-18'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('service_weekly_briefs');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('sunday_date', '2026-10-18');
    expect(result.current.data).toEqual(mockBrief);
  });

  it('fetches list of service weekly briefs', async () => {
    const mockList = [
      {
        id: 'brief-1',
        sunday_date: '2026-10-18',
        turnup_rate: 90,
      },
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue({ data: mockList, error: null });

    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      order: mockOrder,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });

    const { result } = renderHookWithClient(() => useServiceWeeklyBriefsQuery(10));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLimit).toHaveBeenCalledWith(10);
    expect(result.current.data).toEqual(mockList);
  });
});
