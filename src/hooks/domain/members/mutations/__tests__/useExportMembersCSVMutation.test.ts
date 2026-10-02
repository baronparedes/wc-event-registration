import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useExportMembersCSVMutation } from '@/hooks/domain/members/mutations/useExportMembersCSVMutation';

const { mockFetchAdminMembersPage } = vi.hoisted(() => ({
  mockFetchAdminMembersPage: vi.fn(),
}));

vi.mock('@/lib/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/domain/members')>('@/lib/domain/members');
  return {
    ...actual,
    fetchAdminMembersPage: mockFetchAdminMembersPage,
  };
});

describe('useExportMembersCSVMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all matching member pages and builds an escaped CSV in the client', async () => {
    const firstMember = {
      member_id: 'M-001',
      first_name: 'Test Jane',
      last_name: 'Test Doe',
      nickname: 'Test, J',
      email: 'jane@example.com',
      phone: '123',
      date_of_birth: '1990-01-02',
      role: 'volunteer',
      category: 'adult',
      last_activity: '2026-09-30T10:15:00.000Z',
    };

    mockFetchAdminMembersPage
      .mockResolvedValueOnce({
        rows: Array.from({ length: 500 }, (_, index) => ({
          ...firstMember,
          member_id: `M-${String(index + 1).padStart(3, '0')}`,
        })),
        count: 501,
      })
      .mockResolvedValueOnce({ rows: [{ ...firstMember, member_id: 'M-501' }], count: 501 });

    const params = { search_term: ' Jane Doe ', status_filter: 'deleted' as const };
    const { result } = renderHookWithClient(() => useExportMembersCSVMutation(params));
    const response = await act(async () => result.current.mutateAsync());

    expect(mockFetchAdminMembersPage).toHaveBeenCalledWith({
      offset: 0,
      pageSize: 500,
      searchTerm: 'Jane Doe',
      searchTokens: ['Jane', 'Doe'],
      statusFilter: 'deleted',
    });
    expect(mockFetchAdminMembersPage).toHaveBeenNthCalledWith(2, {
      offset: 500,
      pageSize: 500,
      searchTerm: 'Jane Doe',
      searchTokens: ['Jane', 'Doe'],
      statusFilter: 'deleted',
    });
    expect(response.text.split('\n')[0]).toBe(
      'member_id,first_name,last_name,nickname,email,phone,date_of_birth,role,category,last_activity',
    );
    expect(response.text.split('\n')[1]).toBe(
      'M-001,Test Jane,Test Doe,"Test, J",jane@example.com,123,1990-01-02,volunteer,adult,2026-09-30T10:15:00.000Z',
    );
    expect(response.filename).toMatch(/^members-deleted-/);
  });
});
