import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { adminEventFieldsQueryKey } from '@/hooks/domain/event-fields/queries/useAdminEventFieldsQuery'

const { mockEventsBuilder, mockDeleteBuilder, mockFrom } = vi.hoisted(() => {
  const eventsBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  }
  eventsBuilder.select.mockReturnValue(eventsBuilder)
  eventsBuilder.eq.mockReturnValue(eventsBuilder)

  const deleteBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    delete: vi.fn(),
    eq: vi.fn(),
  }
  deleteBuilder.delete.mockReturnValue(deleteBuilder)

  const from = vi.fn((table: string) => {
    if (table === 'events') return eventsBuilder
    if (table === 'event_fields') return deleteBuilder
    throw new Error(`Unexpected table: ${table}`)
  })

  return { mockEventsBuilder: eventsBuilder, mockDeleteBuilder: deleteBuilder, mockFrom: from }
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

import { useDeleteEventFieldMutation } from '@/hooks/domain/event-fields/mutations/useDeleteEventFieldMutation'

describe('useDeleteEventFieldMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteBuilder.eq.mockResolvedValue({ error: null })
  })

  it('deletes a field for a draft event and invalidates field list', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'draft' }, error: null })

    const { result, queryClient } = renderHookWithClient(() => useDeleteEventFieldMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync({ fieldId: 'field-1', eventId: 'event-1' })
    })

    expect(mockDeleteBuilder.delete).toHaveBeenCalled()
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminEventFieldsQueryKey('event-1') })
    })
  })

  it('rejects deleting a field for non-draft events', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'archived' }, error: null })

    const { result } = renderHookWithClient(() => useDeleteEventFieldMutation())

    await expect(
      result.current.mutateAsync({ fieldId: 'field-1', eventId: 'event-1' }),
    ).rejects.toThrow('Cannot delete fields from a published or archived event')
  })

  it('throws when loading event status fails', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: null, error: new Error('read failed') })

    const { result } = renderHookWithClient(() => useDeleteEventFieldMutation())

    await expect(
      result.current.mutateAsync({ fieldId: 'field-1', eventId: 'event-1' }),
    ).rejects.toThrow('read failed')
  })

  it('throws when delete operation fails', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'draft' }, error: null })
    mockDeleteBuilder.eq.mockResolvedValueOnce({ error: new Error('delete failed') })

    const { result } = renderHookWithClient(() => useDeleteEventFieldMutation())

    await expect(
      result.current.mutateAsync({ fieldId: 'field-1', eventId: 'event-1' }),
    ).rejects.toThrow('delete failed')
  })
})
