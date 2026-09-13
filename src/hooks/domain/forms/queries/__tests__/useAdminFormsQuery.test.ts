import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import {
  adminFormsInfiniteQueryKey,
  useAdminFormsQuery,
} from '@/hooks/domain/forms/queries/useAdminFormsQuery';
import { supabase } from '@/lib/infrastructure';

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: {
      from: vi.fn(),
    },
  };
});

describe('useAdminFormsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches forms with default pagination and without search filter', async () => {
    const mockForms = [
      { id: 'form-1', title: 'Form 1', created_at: '2026-01-01T00:00:00Z' },
      { id: 'form-2', title: 'Form 2', created_at: '2026-01-02T00:00:00Z' },
    ];

    const rangeMock = vi.fn().mockResolvedValue({
      data: mockForms,
      error: null,
      count: 2,
    });
    const orderIdMock = vi.fn().mockReturnValue({ range: rangeMock });
    const orderCreatedAtMock = vi.fn().mockReturnValue({ order: orderIdMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderCreatedAtMock });

    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { result } = renderHookWithClient(() => useAdminFormsQuery());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('forms');
    expect(selectMock).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(orderCreatedAtMock).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(orderIdMock).toHaveBeenCalledWith('id', { ascending: false });

    const firstPage = result.current.data?.pages[0];
    expect(firstPage?.items).toEqual(mockForms);
    expect(firstPage?.totalCount).toBe(2);
    expect(firstPage?.hasMore).toBe(false);
    expect(firstPage?.nextCursor).toBeNull();
  });

  it('applies search filter with escaped characters and sets nextCursor when hasMore is true', async () => {
    const mockForms = [
      { id: 'form-1', title: 'Volunteers, 50%', created_at: '2026-01-01T00:00:00Z' },
    ];

    const rangeMock = vi.fn().mockResolvedValue({
      data: mockForms,
      error: null,
      count: 10,
    });
    const orderIdMock = vi.fn().mockReturnValue({ range: rangeMock });
    const orderCreatedAtMock = vi.fn().mockReturnValue({ order: orderIdMock });
    const orMock = vi.fn().mockReturnValue({ order: orderCreatedAtMock });
    const selectMock = vi.fn().mockReturnValue({ or: orMock });

    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { result } = renderHookWithClient(() =>
      useAdminFormsQuery({ pageSize: 1, searchTerm: 'Volunteers, 50%' }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(orMock).toHaveBeenCalledWith(
      'title.ilike.%Volunteers\\, 50\\%%,slug.ilike.%Volunteers\\, 50\\%%',
    );

    const firstPage = result.current.data?.pages[0];
    expect(firstPage?.hasMore).toBe(true);
    expect(firstPage?.nextCursor).toBe('1');
  });

  it('throws error when query fails', async () => {
    const rangeMock = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Database query error'),
      count: 0,
    });
    const orderIdMock = vi.fn().mockReturnValue({ range: rangeMock });
    const orderCreatedAtMock = vi.fn().mockReturnValue({ order: orderIdMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderCreatedAtMock });

    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { result } = renderHookWithClient(() => useAdminFormsQuery());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Database query error');
  });

  it('generates expected infinite query key', () => {
    expect(adminFormsInfiniteQueryKey(10, 'search')).toEqual(['admin-forms', 10, 'search']);
  });
});
