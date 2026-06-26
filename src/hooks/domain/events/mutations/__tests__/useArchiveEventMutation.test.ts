import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    mockSelectBuilder.maybeSingle.mockResolvedValueOnce({ data: { status: 'published' } })

    const { result, queryClient } = renderHookWithClient(() => useArchiveEventMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync('event-1')
    })

    expect(mockUpdateBuilder.update).toHaveBeenCalledWith({ status: 'archived' })
    expect(mockWriteAdminAuditLogSafely).toHaveBeenCalledWith({
      action: 'archive_event',
      resourceType: 'event',
      resourceId: 'event-1',
      metadata: {
        previous_status: 'published',
        next_status: 'archived',
      },
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_EVENTS_QUERY_KEY })
    })
  })
})
