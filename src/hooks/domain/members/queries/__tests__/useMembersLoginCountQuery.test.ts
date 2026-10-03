import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useMembersLoginCountQuery } from '@/hooks/domain/members/queries/useMembersLoginCountQuery';
import * as membersApi from '@/lib/domain/members/api';

vi.mock('@/lib/domain/members/api', () => ({
  fetchMembersLoginCounts: vi.fn(),
}));

describe('useMembersLoginCountQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches members login counts successfully', async () => {
    const mockMap = new Map<string, number>([
      ['user-1', 10],
      ['user-2', 5],
    ]);

    vi.mocked(membersApi.fetchMembersLoginCounts).mockResolvedValueOnce(mockMap);

    const { result } = renderHookWithClient(() => useMembersLoginCountQuery());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(membersApi.fetchMembersLoginCounts).toHaveBeenCalledWith(12);
    expect(result.current.data).toEqual(mockMap);
  });

  it('handles query errors properly', async () => {
    vi.mocked(membersApi.fetchMembersLoginCounts).mockRejectedValueOnce(
      new Error('Failed to fetch login counts: database error'),
    );

    const { result } = renderHookWithClient(() => useMembersLoginCountQuery());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to fetch login counts: database error');
  });
});
