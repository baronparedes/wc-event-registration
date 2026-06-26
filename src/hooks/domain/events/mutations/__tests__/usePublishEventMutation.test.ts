import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { ADMIN_EVENTS_QUERY_KEY } from '@/hooks/domain/events/queries/useAdminEventsQuery'

const { mockSelectBuilder, mockUpdateBuilder, mockFrom, mockWriteAdminAuditLogSafely } = vi.hoisted(
  () => {
    const selectBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
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
        if (table !== 'events') throw new Error(`Unexpected table: ${table}`)
        return {
          select: selectBuilder.select,
          eq: selectBuilder.eq,
          single: selectBuilder.single,
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

import { usePublishEventMutation } from '@/hooks/domain/events/mutations/usePublishEventMutation'

describe('usePublishEventMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateBuilder.eq.mockResolvedValue({ error: null })
  })

  it('publishes a valid event, writes audit log, and invalidates events list', async () => {
    mockSelectBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'event-1',
        title: 'Event',
        slug: 'event',
        description: 'Desc',
        location: 'Gym',
        starts_at: '2026-07-01T10:00:00.000Z',
        ends_at: '2026-07-01T12:00:00.000Z',
        registration_opens_at: '2026-06-01T10:00:00.000Z',
        registration_closes_at: '2026-06-30T10:00:00.000Z',
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'open',
      },
      error: null,
    })

    const { result, queryClient } = renderHookWithClient(() => usePublishEventMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync('event-1')
    })

    expect(mockUpdateBuilder.update).toHaveBeenCalledWith({ status: 'published' })
    expect(mockWriteAdminAuditLogSafely).toHaveBeenCalledWith({
      action: 'publish_event',
      resourceType: 'event',
      resourceId: 'event-1',
      metadata: {
        previous_status: 'draft',
        next_status: 'published',
      },
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_EVENTS_QUERY_KEY })
    })
  })

  it('throws a validation error with missing fields when event cannot be published', async () => {
    mockSelectBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'event-2',
        title: 'Event',
        slug: 'event',
        description: '',
        location: '',
        starts_at: null,
        ends_at: null,
        registration_opens_at: null,
        registration_closes_at: null,
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'open',
      },
      error: null,
    })

    const { result } = renderHookWithClient(() => usePublishEventMutation())

    await expect(result.current.mutateAsync('event-2')).rejects.toMatchObject({
      message: expect.stringContaining('Cannot publish:'),
      missingFields: expect.arrayContaining(['Description', 'Location']),
    })
  })
})
