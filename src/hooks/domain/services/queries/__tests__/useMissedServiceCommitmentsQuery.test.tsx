import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { fetchMissedServiceCommitments } from '@/lib/domain/services';

import { useMissedServiceCommitmentsQuery } from '../useMissedServiceCommitmentsQuery';

vi.mock('@/lib/domain/services', () => ({
  fetchMissedServiceCommitments: vi.fn(),
}));

describe('useMissedServiceCommitmentsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches missed commitments for a given Sunday date', async () => {
    const mockData = [
      {
        user_id: 'user-1',
        member_id: 'MEM-001',
        full_name: 'Test Volunteer',
        nickname: null,
        role: 'Usher',
        phone: '123456',
        avatar_object_key: null,
        service_date: '2026-03-15',
        time_slot: '9AM',
        status: 'absent' as const,
        category: 'Adult',
      },
    ];
    vi.mocked(fetchMissedServiceCommitments).mockResolvedValue(mockData);

    const { result } = renderHookWithClient(() =>
      useMissedServiceCommitmentsQuery({
        sunday_date: '2026-03-15',
        time_slot: '9AM',
        role: 'Usher',
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMissedServiceCommitments).toHaveBeenCalledWith({
      p_sunday_date: '2026-03-15',
      p_time_slot: '9AM',
      p_role: 'Usher',
    });
    expect(result.current.data).toEqual(mockData);
  });

  it('is disabled when enabled prop is false', () => {
    const { result } = renderHookWithClient(() =>
      useMissedServiceCommitmentsQuery(
        {
          sunday_date: '2026-03-15',
        },
        false,
      ),
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMissedServiceCommitments).not.toHaveBeenCalled();
  });
});
