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
  }
  updateBuilder.update.mockReturnValue(updateBuilder)
  updateBuilder.eq.mockResolvedValue({ error: null })

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

import { useReorderEventFieldsMutation } from '@/hooks/domain/event-fields/mutations/useReorderEventFieldsMutation'

describe('useReorderEventFieldsMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reorders fields for a draft event and invalidates field list', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'draft' }, error: null })

    const { result, queryClient } = renderHookWithClient(() => useReorderEventFieldsMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync({ event_id: 'event-1', orderedIds: ['field-2', 'field-1'] })
    })

    expect(mockUpdateBuilder.update).toHaveBeenNthCalledWith(1, { display_order: 0 })
    expect(mockUpdateBuilder.update).toHaveBeenNthCalledWith(2, { display_order: 1 })
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminEventFieldsQueryKey('event-1') })
    })
  })

  it('rejects reordering fields for non-draft events', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'published' }, error: null })

    const { result } = renderHookWithClient(() => useReorderEventFieldsMutation())

    await expect(
      result.current.mutateAsync({ event_id: 'event-1', orderedIds: ['field-1'] }),
    ).rejects.toThrow('Cannot reorder fields on a published or archived event')
  })

  it('throws when event status lookup fails', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error('lookup failed'),
    })

    const { result } = renderHookWithClient(() => useReorderEventFieldsMutation())

    await expect(
      result.current.mutateAsync({ event_id: 'event-1', orderedIds: ['field-1'] }),
    ).rejects.toThrow('lookup failed')

    expect(mockUpdateBuilder.update).not.toHaveBeenCalled()
  })
})
