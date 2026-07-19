import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useUpsertAttendanceSavedViewMutation } from '@/hooks/domain/attendance/mutations/useUpsertAttendanceSavedViewMutation';
import type { AttendanceSavedView } from '@/lib/domain/attendance-views';

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

const mockViewConfig = {
  nameOrMemberQuery: '',
  role: [],
  category: 'all',
  checkInStatus: 'all' as const,
  dynamicFilters: [],
  groupBy: [],
  visibleFields: [],
};

describe('useUpsertAttendanceSavedViewMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls upsert-attendance-saved-view edge function with payload', async () => {
    const eventId = faker.string.uuid();
    const savedView: AttendanceSavedView = {
      id: faker.string.uuid(),
      event_id: eventId,
      name: 'New View',
      view_config: mockViewConfig,
      created_at: '2026-07-19T00:00:00.000Z',
      updated_at: '2026-07-19T00:00:00.000Z',
    };
    mockCaller.mockResolvedValueOnce({ success: true, ...savedView });

    const { result } = renderHookWithClient(() => useUpsertAttendanceSavedViewMutation());

    await act(async () => {
      await result.current.mutateAsync({
        event_id: eventId,
        view_config: mockViewConfig,
      });
    });

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('upsert-attendance-saved-view');
    expect(mockCaller).toHaveBeenCalledWith({
      event_id: eventId,
      view_config: mockViewConfig,
    });
  });

  it('returns the saved view on success', async () => {
    const eventId = faker.string.uuid();
    const savedView: AttendanceSavedView = {
      id: faker.string.uuid(),
      event_id: eventId,
      name: 'Saved',
      view_config: mockViewConfig,
      created_at: '2026-07-19T00:00:00.000Z',
      updated_at: '2026-07-19T00:00:00.000Z',
    };
    mockCaller.mockResolvedValueOnce({ success: true, ...savedView });

    const { result } = renderHookWithClient(() => useUpsertAttendanceSavedViewMutation());

    const response = await act(async () =>
      result.current.mutateAsync({ event_id: eventId, view_config: mockViewConfig }),
    );

    expect(response).toMatchObject({ id: savedView.id, name: 'Saved' });
  });

  it('invalidates saved views query on success', async () => {
    const eventId = faker.string.uuid();
    const savedView: AttendanceSavedView = {
      id: faker.string.uuid(),
      event_id: eventId,
      name: 'View',
      view_config: mockViewConfig,
      created_at: '2026-07-19T00:00:00.000Z',
      updated_at: '2026-07-19T00:00:00.000Z',
    };
    mockCaller.mockResolvedValueOnce({ success: true, ...savedView });

    const { result, queryClient } = renderHookWithClient(() =>
      useUpsertAttendanceSavedViewMutation(),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({ event_id: eventId, view_config: mockViewConfig });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['admin-attendance-saved-views', eventId]),
        }),
      );
    });
  });

  it('throws when edge function returns success: false', async () => {
    mockCaller.mockResolvedValueOnce({ success: false, error: 'Failed to save view.' });

    const { result } = renderHookWithClient(() => useUpsertAttendanceSavedViewMutation());

    await expect(
      act(async () =>
        result.current.mutateAsync({
          event_id: faker.string.uuid(),
          view_config: mockViewConfig,
        }),
      ),
    ).rejects.toThrow('Failed to save view.');
  });
});
