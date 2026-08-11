import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeMemberEventHistoryItem } from '@/__tests__/factories';
import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useMemberEventHistoryQuery } from '@/hooks/domain/members/queries/useMemberEventHistoryQuery';

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: { rpc: mockRpc },
  };
});

describe('useMemberEventHistoryQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when userId is undefined', () => {
    const { result } = renderHookWithClient(() => useMemberEventHistoryQuery(undefined));
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns parsed history items', async () => {
    const userId = faker.string.uuid();
    const item = makeMemberEventHistoryItem({ check_in_status: 'checked_in' });

    mockRpc.mockResolvedValueOnce({ data: [item], error: null });

    const { result } = renderHookWithClient(() => useMemberEventHistoryQuery(userId));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith('get_member_event_history', { p_user_id: userId });
    expect(result.current.data).toEqual([item]);
  });

  it('returns empty array when rpc returns null', async () => {
    const userId = faker.string.uuid();
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useMemberEventHistoryQuery(userId));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('returns error state when rpc fails', async () => {
    const userId = faker.string.uuid();
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('rpc failed') });

    const { result } = renderHookWithClient(() => useMemberEventHistoryQuery(userId));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('returns multiple items sorted as returned by the rpc', async () => {
    const userId = faker.string.uuid();
    const items = [
      makeMemberEventHistoryItem({ event_title: 'Event A' }),
      makeMemberEventHistoryItem({ event_title: 'Event B' }),
    ];
    mockRpc.mockResolvedValueOnce({ data: items, error: null });

    const { result } = renderHookWithClient(() => useMemberEventHistoryQuery(userId));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].event_title).toBe('Event A');
  });
});
