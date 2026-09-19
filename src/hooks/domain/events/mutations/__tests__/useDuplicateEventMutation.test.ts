import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useDuplicateEventMutation } from '@/hooks/domain/events/mutations/useDuplicateEventMutation';
import { ADMIN_EVENTS_QUERY_KEY } from '@/hooks/domain/events/queries/useAdminEventsQuery';

const { mockFunctionsInvoke } = vi.hoisted(() => ({
  mockFunctionsInvoke: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: {
      functions: {
        invoke: mockFunctionsInvoke,
      },
    },
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

    mockFunctionsInvoke.mockResolvedValueOnce({
      data: {
        success: true,
        new_event_id: newEventId,
      },
      error: null,
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
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('duplicate-event', {
      body: {
        source_event_id: sourceEventId,
        new_title: newTitle,
        new_slug: newSlug,
      },
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_EVENTS_QUERY_KEY });
  });

  it('throws an error if edge function invocation returns an error', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Network error'),
    });

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
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: {
        success: false,
        error: 'An event with this slug already exists. Please choose a different slug.',
      },
      error: null,
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
