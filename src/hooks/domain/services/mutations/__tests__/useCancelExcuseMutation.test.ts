import { describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { cancelServiceExcuse } from '@/lib/domain/services';

import { useCancelExcuseMutation } from '../useCancelExcuseMutation';

vi.mock('@/lib/domain/services', () => ({
  cancelServiceExcuse: vi.fn(),
}));

describe('useCancelExcuseMutation', () => {
  it('calls cancelServiceExcuse and invalidates relevant queries on success', async () => {
    vi.mocked(cancelServiceExcuse).mockResolvedValue();

    const { result, queryClient } = renderHookWithClient(() => useCancelExcuseMutation());

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await result.current.mutateAsync('test-excuse-id');

    expect(cancelServiceExcuse).toHaveBeenCalledWith('test-excuse-id');

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['member-excused-schedule'] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['service-excuse-requests'] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['commitment-dashboard-stats'] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['missed-service-commitments'] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['volunteer-attendance-log'] });
  });
});

it('handles errors properly and does not invalidate queries on failure', async () => {
  vi.mocked(cancelServiceExcuse).mockRejectedValue(new Error('Network error'));

  const { result, queryClient } = renderHookWithClient(() => useCancelExcuseMutation());

  const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

  await expect(result.current.mutateAsync('test-excuse-id')).rejects.toThrow('Network error');

  expect(cancelServiceExcuse).toHaveBeenCalledWith('test-excuse-id');
  expect(invalidateQueriesSpy).not.toHaveBeenCalled();
});
