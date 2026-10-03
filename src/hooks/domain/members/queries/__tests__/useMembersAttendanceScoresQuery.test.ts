import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { env } from '@/config/env';
import { useMembersAttendanceScoresQuery } from '@/hooks/domain/members/queries/useMembersAttendanceScoresQuery';
import * as membersApi from '@/lib/domain/members/api';

vi.mock('@/lib/domain/members/api', () => ({
  fetchMembersAttendanceScores: vi.fn(),
}));

describe('useMembersAttendanceScoresQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches members attendance scores successfully', async () => {
    const mockMap = new Map<string, number>([
      ['user-1', 8.5],
      ['user-2', -1.0],
    ]);

    vi.mocked(membersApi.fetchMembersAttendanceScores).mockResolvedValueOnce(mockMap);

    const { result } = renderHookWithClient(() => useMembersAttendanceScoresQuery(12));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(membersApi.fetchMembersAttendanceScores).toHaveBeenCalledWith(12, env.excuseEventId);
    expect(result.current.data).toEqual(mockMap);
  });

  it('handles query errors properly', async () => {
    vi.mocked(membersApi.fetchMembersAttendanceScores).mockRejectedValueOnce(
      new Error('Failed to fetch attendance scores: RPC error'),
    );

    const { result } = renderHookWithClient(() => useMembersAttendanceScoresQuery(12));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to fetch attendance scores: RPC error');
  });
});
