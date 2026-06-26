import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { ADMIN_EVENTS_QUERY_KEY } from '@/hooks/domain/events/queries/useAdminEventsQuery'

const {
  mockGetSession,
  mockAdminsBuilder,
  mockEventsInsertBuilder,
  mockFrom,
  mockWriteAdminAuditLogSafely,
} = vi.hoisted(() => {
  const adminsBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  }
  adminsBuilder.select.mockReturnValue(adminsBuilder)
  adminsBuilder.eq.mockReturnValue(adminsBuilder)

  const eventsInsertBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  }
  eventsInsertBuilder.insert.mockReturnValue(eventsInsertBuilder)
  eventsInsertBuilder.select.mockReturnValue(eventsInsertBuilder)

  return {
    mockGetSession: vi.fn(),
    mockAdminsBuilder: adminsBuilder,
    mockEventsInsertBuilder: eventsInsertBuilder,
    mockFrom: vi.fn((table: string) => {
      if (table === 'admins') return adminsBuilder
      if (table === 'events') return eventsInsertBuilder
      throw new Error(`Unexpected table: ${table}`)
    }),
    mockWriteAdminAuditLogSafely: vi.fn(),
  }
})

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')

  return {
    ...actual,
    supabase: {
      auth: {
        getSession: mockGetSession,
      },
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

import { useCreateEventMutation } from '@/hooks/domain/events/mutations/useCreateEventMutation'

describe('useCreateEventMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'auth-1' },
        },
      },
    })
  })

  it('creates an event, writes audit log, and invalidates events list', async () => {
    mockAdminsBuilder.maybeSingle.mockResolvedValueOnce({ data: { id: 'admin-1' } })
    mockEventsInsertBuilder.single.mockResolvedValueOnce({
      data: { id: 'event-1' },
      error: null,
    })

    const { result, queryClient } = renderHookWithClient(() => useCreateEventMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const createdId = await act(async () =>
      result.current.mutateAsync({
        title: 'World Cup',
        slug: 'world-cup',
        description: '',
        location: '',
        starts_at: '',
        ends_at: '',
        registration_opens_at: '',
        registration_closes_at: '',
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'open',
      }),
    )

    expect(createdId).toBe('event-1')
    expect(mockEventsInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'world-cup',
        title: 'World Cup',
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'open',
        require_id_lookup: true,
        created_by_admin_id: 'admin-1',
        description: null,
        location: null,
      }),
    )
    expect(mockWriteAdminAuditLogSafely).toHaveBeenCalledWith({
      action: 'create_event',
      resourceType: 'event',
      resourceId: 'event-1',
      metadata: {
        slug: 'world-cup',
        title: 'World Cup',
        status: 'draft',
      },
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_EVENTS_QUERY_KEY })
    })
  })
})
