import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { QUERY_KEYS } from '@/config/constants';

import { useBulkImportRecruitmentMutation } from '../useBulkImportRecruitmentMutation';

const { mockBulkImportCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const caller = vi.fn();
  return {
    mockBulkImportCaller: caller,
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

describe('useBulkImportRecruitmentMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls edge function and invalidates recruitment caches on success', async () => {
    mockBulkImportCaller.mockResolvedValueOnce({
      success: true,
      inserted_count: 5,
      skipped_count: 1,
      total_count: 6,
    });

    const { result, queryClient } = renderHookWithClient(() => useBulkImportRecruitmentMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const response = await act(async () =>
      result.current.mutateAsync([
        {
          email: 'test@example.com',
          first_name: 'Test First',
          last_name: 'Sample Last',
          nickname: 'Test Nick',
          phone: '09171234567',
          date_of_birth: '1995-01-01',
          gender: 'Male',
          life_stage: 'Single',
          desired_role: 'Usher',
          status: 'active',
          current_step: 1,
          personal_details: {},
          emergency_contact: {},
          application_history: {},
          spiritual_background: {},
          dgroup_info: {},
          is_endorsed: false,
          transactions: [],
        },
      ]),
    );

    expect(response).toEqual({
      success: true,
      inserted_count: 5,
      skipped_count: 1,
      total_count: 6,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.adminRecruitmentApplications(),
    });
  });
});
