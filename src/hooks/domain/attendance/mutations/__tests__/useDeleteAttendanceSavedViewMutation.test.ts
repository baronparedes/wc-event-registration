import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useDeleteAttendanceSavedViewMutation } from '@/hooks/domain/attendance/mutations/useDeleteAttendanceSavedViewMutation';

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

describe('useDeleteAttendanceSavedViewMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls delete-attendance-saved-view edge function with view id', async () => {
    const viewId = faker.string.uuid();
    mockCaller.mockResolvedValueOnce({ success: true });

    const { result } = renderHookWithClient(() => useDeleteAttendanceSavedViewMutation());

    await act(async () => {
      await result.current.mutateAsync({ id: viewId });
    });

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('delete-attendance-saved-view');
    expect(mockCaller).toHaveBeenCalledWith({ id: viewId });
  });

  it('invalidates saved views query when eventId is provided', async () => {
    const viewId = faker.string.uuid();
    const eventId = faker.string.uuid();
    mockCaller.mockResolvedValueOnce({ success: true });

    const { result, queryClient } = renderHookWithClient(() =>
      useDeleteAttendanceSavedViewMutation(),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({ id: viewId, eventId });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['admin-attendance-saved-views', eventId]),
        }),
      );
    });
  });

  it('does not invalidate when eventId is omitted', async () => {
    const viewId = faker.string.uuid();
    mockCaller.mockResolvedValueOnce({ success: true });

    const { result, queryClient } = renderHookWithClient(() =>
      useDeleteAttendanceSavedViewMutation(),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({ id: viewId });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('throws when edge function returns success: false', async () => {
    mockCaller.mockResolvedValueOnce({ success: false, error: 'Failed to delete view.' });

    const { result } = renderHookWithClient(() => useDeleteAttendanceSavedViewMutation());

    await expect(
      act(async () => result.current.mutateAsync({ id: faker.string.uuid() })),
    ).rejects.toThrow('Failed to delete view.');
  });
});
