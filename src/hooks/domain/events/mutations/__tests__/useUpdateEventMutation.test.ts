import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { ADMIN_EVENTS_QUERY_KEY } from '@/hooks/domain/events/queries/useAdminEventsQuery'
import { adminEventQueryKey } from '@/hooks/domain/events/queries/useAdminEventQuery'

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
      mockFrom: vi.fn((table: string) => {
        if (table !== 'events') {
          throw new Error(`Unexpected table: ${table}`)
        }
        return {
          select: selectBuilder.select,
          eq: selectBuilder.eq,
          maybeSingle: selectBuilder.maybeSingle,
          update: updateBuilder.update,
        }
      }),
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

import { useUpdateEventMutation } from '@/hooks/domain/events/mutations/useUpdateEventMutation'

describe('useUpdateEventMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateBuilder.eq.mockResolvedValue({ error: null })
  })

  it('updates an event, records changed fields, and invalidates related queries', async () => {
    mockSelectBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        title: 'Old Title',
        description: 'old',
        location: 'old',
        starts_at: null,
        ends_at: null,
        registration_opens_at: null,
        registration_closes_at: null,
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'closed',
      },
    })

    const { result, queryClient } = renderHookWithClient(() => useUpdateEventMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync({
        id: 'event-1',
        title: 'New Title',
        description: '',
        location: '',
        starts_at: '',
        ends_at: '',
        registration_opens_at: '',
        registration_closes_at: '',
        status: 'published',
        duplicate_policy: 'allow_update',
        registration_mode: 'open',
      })
    })

    expect(mockUpdateBuilder.update).toHaveBeenCalledWith({
      title: 'New Title',
      description: null,
      location: null,
      starts_at: null,
      ends_at: null,
      registration_opens_at: null,
      registration_closes_at: null,
      status: 'published',
      duplicate_policy: 'allow_update',
      registration_mode: 'open',
    })
    expect(mockWriteAdminAuditLogSafely).toHaveBeenCalledWith({
      action: 'update_event',
      resourceType: 'event',
      resourceId: 'event-1',
      metadata: {
        changed_fields: [
          'title',
          'description',
          'location',
          'status',
          'duplicate_policy',
          'registration_mode',
        ],
      },
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_EVENTS_QUERY_KEY })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminEventQueryKey('event-1') })
    })
  })
})
