import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAdminMembersDashboardQuery } from '@/hooks/domain/members/queries/useAdminMembersDashboardQuery';
import * as membersApi from '@/lib/domain/members/api';

vi.mock('@/lib/domain/members/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/domain/members/api')>(
    '@/lib/domain/members/api',
  );
  return {
    ...actual,
    fetchActiveMembers: vi.fn(),
  };
});

describe('useAdminMembersDashboardQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches active members and computes dashboard metrics', async () => {
    vi.mocked(membersApi.fetchActiveMembers).mockResolvedValue([
      {
        id: 'user-1',
        member_id: 'RFID-1',
        avatar_object_key: null,
        is_active: true,
        full_name: 'Test Member One',
        first_name: 'Test',
        last_name: 'Test One',
        nickname: 'Test Nick',
        email: 'test1@example.com',
        phone: '09171234567',
        date_of_birth: '1995-05-15',
        role: 'IMT Support / Usher',
        category: 'Adult',
        metadata: {
          first_sunday: '9AM',
          dgroup_status: 'member',
          dgroup_leader: 'Test Leader',
        },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        notes: [],
      },
    ]);

    const { result } = renderHookWithClient(() => useAdminMembersDashboardQuery());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.totalActiveMembers).toBe(1);
    expect(result.current.data?.roleDistributions[0].role).toBe('IMT Support');
    expect(result.current.data?.dgroupAnalytics.inDGroupCount).toBe(1);
  });
});
