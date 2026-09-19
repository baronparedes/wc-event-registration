import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useGetMemberExcusedSchedule } from '@/hooks/domain/members/queries/useGetMemberExcusedSchedule';

const { mockCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const caller = vi.fn();
  return {
    mockCaller: caller,
    mockCreateEdgeFunctionCaller: vi.fn(() => caller),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  };
});

describe('useGetMemberExcusedSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches excused member schedule successfully', async () => {
    const mockRecords = [
      {
        memberId: 'MEM-001',
        requestDate: '2026-09-20',
        services: '9AM, 12NN',
      },
    ];

    mockCaller.mockResolvedValueOnce({
      success: true,
      records: mockRecords,
    });

    const { result } = renderHookWithClient(() => useGetMemberExcusedSchedule(2026, 8));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCaller).toHaveBeenCalledWith({ year: 2026, monthIndex: 8, userId: undefined });
    expect(result.current.data).toEqual(mockRecords);
  });

  it('passes target userId to edge function caller when provided', async () => {
    const mockRecords = [
      {
        userId: 'target-user-uuid',
        memberId: 'MEM-002',
        requestDate: '2026-09-20',
        services: '9AM',
      },
    ];

    mockCaller.mockResolvedValueOnce({
      success: true,
      records: mockRecords,
    });

    const { result } = renderHookWithClient(() =>
      useGetMemberExcusedSchedule(2026, 8, 'target-user-uuid'),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCaller).toHaveBeenCalledWith({
      year: 2026,
      monthIndex: 8,
      userId: 'target-user-uuid',
    });
    expect(result.current.data).toEqual(mockRecords);
  });

  it('throws an error when edge function call fails', async () => {
    mockCaller.mockResolvedValueOnce({
      success: false,
      error: 'Custom failure message',
    });

    const { result } = renderHookWithClient(() => useGetMemberExcusedSchedule(2026, 8));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('Custom failure message');
  });

  it('throws default error message when error is missing in failed response', async () => {
    mockCaller.mockResolvedValueOnce({
      success: false,
    });

    const { result } = renderHookWithClient(() => useGetMemberExcusedSchedule(2026, 8));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('Failed to fetch excused schedule');
  });
});
