import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { ADMIN_EVENTS_QUERY_KEY } from '@/hooks/domain/events/queries/useAdminEventsQuery'

const { mockSelectBuilder, mockUpdateBuilder, mockFrom, mockWriteAdminAuditLogSafely } = vi.hoisted(
  () => {
    const selectBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    }
    selectBuilder.select.mockReturnValue(selectBuilder)
    selectBuilder.eq.mockReturnValue(selectBuilder)

    const updateBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      update: vi.fn(),
      eq: vi.fn(),
    }
    updateBuilder.update.mockReturnValue(updateBuilder)

    return {
      mockSelectBuilder: selectBuilder,
      mockUpdateBuilder: updateBuilder,
      mockFrom: vi.fn(() => ({
        select: selectBuilder.select,
        eq: selectBuilder.eq,
        maybeSingle: selectBuilder.maybeSingle,
        update: updateBuilder.update,
      })),
      mockWriteAdminAuditLogSafely: vi.fn(),
    }
  },
)

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

vi.mock('@/lib/domain/admin-audit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/domain/admin-audit')>(
    '@/lib/domain/admin-audit',
  )
  return {
    ...actual,
    writeAdminAuditLogSafely: mockWriteAdminAuditLogSafely,
  }
})

import { useArchiveEventMutation } from '@/hooks/domain/events/mutations/useArchiveEventMutation'

describe('useArchiveEventMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateBuilder.eq.mockResolvedValue({ error: null })
  })

  it('archives an event, writes audit log, and invalidates events list', async () => {
    const eventId = faker.string.uuid()
    mockSelectBuilder.maybeSingle.mockResolvedValueOnce({ data: { status: 'published' } })

    const { result, queryClient } = renderHookWithClient(() => useArchiveEventMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync(eventId)
    })

    expect(mockUpdateBuilder.update).toHaveBeenCalledWith({ status: 'archived' })
    expect(mockWriteAdminAuditLogSafely).toHaveBeenCalledWith({
      action: 'archive_event',
      resourceType: 'event',
      resourceId: eventId,
      metadata: {
        previous_status: 'published',
        next_status: 'archived',
      },
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_EVENTS_QUERY_KEY })
    })
  })

  it('uses null previous status when event lookup returns no row', async () => {
    const eventId = faker.string.uuid()
    mockSelectBuilder.maybeSingle.mockResolvedValueOnce({ data: null })

    const { result } = renderHookWithClient(() => useArchiveEventMutation())

    await act(async () => {
      await result.current.mutateAsync(eventId)
    })

    expect(mockWriteAdminAuditLogSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          previous_status: null,
          next_status: 'archived',
        },
      }),
    )
  })

  it('throws when archive update fails', async () => {
    const eventId = faker.string.uuid()
    mockSelectBuilder.maybeSingle.mockResolvedValueOnce({ data: { status: 'open' } })
    mockUpdateBuilder.eq.mockResolvedValueOnce({ error: new Error('update failed') })

    const { result, queryClient } = renderHookWithClient(() => useArchiveEventMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await expect(result.current.mutateAsync(eventId)).rejects.toThrow('update failed')
    expect(mockWriteAdminAuditLogSafely).not.toHaveBeenCalled()
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
