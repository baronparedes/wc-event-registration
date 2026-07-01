import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { faker } from '@faker-js/faker'
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
    const eventId = faker.string.uuid()
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
        id: eventId,
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
        allow_public_registrations: false,
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
      allow_public_registrations: false,
    })
    expect(mockWriteAdminAuditLogSafely).toHaveBeenCalledWith({
      action: 'update_event',
      resourceType: 'event',
      resourceId: eventId,
      metadata: {
        changed_fields: [
          'title',
          'description',
          'location',
          'status',
          'duplicate_policy',
          'registration_mode',
          'allow_public_registrations',
        ],
      },
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_EVENTS_QUERY_KEY })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminEventQueryKey(eventId) })
    })
  })

  it('throws when event update fails', async () => {
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
    mockUpdateBuilder.eq.mockResolvedValueOnce({ error: new Error('update failed') })

    const { result } = renderHookWithClient(() => useUpdateEventMutation())

    await expect(
      result.current.mutateAsync({
        id: faker.string.uuid(),
        title: 'Title',
        description: 'desc',
        location: 'location',
        starts_at: undefined,
        ends_at: undefined,
        registration_opens_at: undefined,
        registration_closes_at: undefined,
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'closed',
      }),
    ).rejects.toThrow('update failed')

    expect(mockWriteAdminAuditLogSafely).not.toHaveBeenCalled()
  })

  it('records every field as changed when previous event is missing', async () => {
    mockSelectBuilder.maybeSingle.mockResolvedValueOnce({ data: null })

    const { result } = renderHookWithClient(() => useUpdateEventMutation())

    await act(async () => {
      await result.current.mutateAsync({
        id: faker.string.uuid(),
        title: 'Brand New',
        description: 'desc',
        location: 'hall',
        starts_at: '2026-07-01T09:00:00.000Z',
        ends_at: '2026-07-01T10:00:00.000Z',
        registration_opens_at: '2026-06-01T00:00:00.000Z',
        registration_closes_at: '2026-06-30T23:59:00.000Z',
        status: 'published',
        duplicate_policy: 'allow_update',
        registration_mode: 'open',
        allow_public_registrations: true,
      })
    })

    expect(mockWriteAdminAuditLogSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          changed_fields: [
            'title',
            'description',
            'location',
            'starts_at',
            'ends_at',
            'registration_opens_at',
            'registration_closes_at',
            'status',
            'duplicate_policy',
            'registration_mode',
            'allow_public_registrations',
          ],
        },
      }),
    )
  })

  it('merges allow_name_lookup into metadata when provided', async () => {
    mockSelectBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        title: 'Existing',
        description: null,
        location: null,
        starts_at: null,
        ends_at: null,
        registration_opens_at: null,
        registration_closes_at: null,
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'closed',
        allow_public_registrations: false,
        metadata: { legacy_flag: true },
      },
    })

    const { result } = renderHookWithClient(() => useUpdateEventMutation())

    await act(async () => {
      await result.current.mutateAsync({
        id: faker.string.uuid(),
        title: 'Existing',
        description: undefined,
        location: undefined,
        starts_at: undefined,
        ends_at: undefined,
        registration_opens_at: undefined,
        registration_closes_at: undefined,
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'closed',
        allow_public_registrations: false,
        allow_name_lookup: true,
      })
    })

    expect(mockUpdateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          legacy_flag: true,
          allow_name_lookup: true,
        },
      }),
    )
  })
})
