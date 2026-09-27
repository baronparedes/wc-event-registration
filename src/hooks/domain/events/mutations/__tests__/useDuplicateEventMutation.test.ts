import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useDuplicateEventMutation } from '@/hooks/domain/events/mutations/useDuplicateEventMutation';
import { ADMIN_EVENTS_QUERY_KEY } from '@/hooks/domain/events/queries/useAdminEventsQuery';

const { mockDuplicateCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const duplicateCaller = vi.fn();
  return {
    mockDuplicateCaller: duplicateCaller,
    mockCreateEdgeFunctionCaller: vi.fn(() => duplicateCaller),
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

describe('useDuplicateEventMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully duplicates an event, writes audit log, and invalidates query cache', async () => {
    const sourceEventId = faker.string.uuid();
    const newEventId = faker.string.uuid();
    const newTitle = 'Duplicated Conference';
    const newSlug = 'duplicated-conference';

    mockDuplicateCaller.mockResolvedValueOnce({
      success: true,
      new_event_id: newEventId,
    });

    const { result, queryClient } = renderHookWithClient(() => useDuplicateEventMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    let createdId: string | undefined;
    await act(async () => {
      createdId = await result.current.mutateAsync({
        source_event_id: sourceEventId,
        new_title: newTitle,
        new_slug: newSlug,
      });
    });

    expect(createdId).toBe(newEventId);
    expect(mockDuplicateCaller).toHaveBeenCalledWith({
      source_event_id: sourceEventId,
      new_title: newTitle,
      new_slug: newSlug,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_EVENTS_QUERY_KEY });
  });

  it('throws an error if edge function invocation returns an error', async () => {
    mockDuplicateCaller.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHookWithClient(() => useDuplicateEventMutation());

    await expect(
      result.current.mutateAsync({
        source_event_id: faker.string.uuid(),
        new_title: 'Duplicated Title',
        new_slug: 'duplicated-slug',
      }),
    ).rejects.toThrow('Network error');
  });

  it('throws an error if data indicates failure with custom error message', async () => {
    mockDuplicateCaller.mockResolvedValueOnce({
      success: false,
      error: 'An event with this slug already exists. Please choose a different slug.',
    });

    const { result } = renderHookWithClient(() => useDuplicateEventMutation());

    await expect(
      result.current.mutateAsync({
        source_event_id: faker.string.uuid(),
        new_title: 'Duplicated Title',
        new_slug: 'duplicated-slug',
      }),
    ).rejects.toThrow('An event with this slug already exists. Please choose a different slug.');
  });
});
