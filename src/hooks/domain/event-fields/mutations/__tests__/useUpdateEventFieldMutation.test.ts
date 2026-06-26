import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { adminEventFieldsQueryKey } from '@/hooks/domain/event-fields/queries/useAdminEventFieldsQuery'

const { mockEventsBuilder, mockUpdateBuilder, mockFrom } = vi.hoisted(() => {
  const eventsBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  }
  eventsBuilder.select.mockReturnValue(eventsBuilder)
  eventsBuilder.eq.mockReturnValue(eventsBuilder)

  const updateBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  }
  updateBuilder.update.mockReturnValue(updateBuilder)
  updateBuilder.eq.mockReturnValue(updateBuilder)
  updateBuilder.select.mockReturnValue(updateBuilder)

  const from = vi.fn((table: string) => {
    if (table === 'events') return eventsBuilder
    if (table === 'event_fields') return updateBuilder
    throw new Error(`Unexpected table: ${table}`)
  })

  return { mockEventsBuilder: eventsBuilder, mockUpdateBuilder: updateBuilder, mockFrom: from }
})

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')
  return {
    ...actual,
    supabase: {
      from: mockFrom,
    },
  }
})

import { useUpdateEventFieldMutation } from '@/hooks/domain/event-fields/mutations/useUpdateEventFieldMutation'

describe('useUpdateEventFieldMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates a field on a draft event and invalidates field list', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'draft' }, error: null })
    mockUpdateBuilder.single.mockResolvedValueOnce({
      data: { id: 'field-1', label: 'New Label' },
      error: null,
    })

    const { result, queryClient } = renderHookWithClient(() => useUpdateEventFieldMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const updated = await act(async () =>
      result.current.mutateAsync({
        id: 'field-1',
        event_id: 'event-1',
        label: 'New Label',
      }),
    )

    expect(updated).toEqual({ id: 'field-1', label: 'New Label' })
    expect(mockUpdateBuilder.update).toHaveBeenCalledWith({
      event_id: 'event-1',
      label: 'New Label',
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminEventFieldsQueryKey('event-1') })
    })
  })

  it('rejects locked field changes on published events', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'published' }, error: null })

    const { result } = renderHookWithClient(() => useUpdateEventFieldMutation())

    await expect(
      result.current.mutateAsync({
        id: 'field-1',
        event_id: 'event-1',
        label: 'New Label',
        field_type: 'number',
      }),
    ).rejects.toThrow(
      'Published events can only have field labels, placeholders, and help text edited',
    )
  })
})
