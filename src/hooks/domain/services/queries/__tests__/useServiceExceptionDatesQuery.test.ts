import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useServiceExceptionDatesQuery } from '@/hooks/domain/services';

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

describe('useServiceExceptionDatesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches service exception dates successfully', async () => {
    const mockData = [
      {
        id: 'ex-1',
        exception_date: '2026-03-29',
        reason: 'Easter Sunday Special Event',
        created_at: '2026-03-01T00:00:00Z',
      },
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null });

    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      order: mockOrder,
    });

    const { result } = renderHookWithClient(() => useServiceExceptionDatesQuery());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('service_exception_dates');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockOrder).toHaveBeenCalledWith('exception_date', { ascending: true });
    expect(result.current.data).toEqual(mockData);
  });

  it('handles query error gracefully', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Database error'),
    });

    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      order: mockOrder,
    });

    const { result } = renderHookWithClient(() => useServiceExceptionDatesQuery());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
