import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { adminEventFieldsQueryKey } from '@/hooks/domain/event-fields/queries/useAdminEventFieldsQuery'

const { mockEventsBuilder, mockOrderBuilder, mockInsertBuilder, mockFrom } = vi.hoisted(() => {
  const eventsBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  }
  eventsBuilder.select.mockReturnValue(eventsBuilder)
  eventsBuilder.eq.mockReturnValue(eventsBuilder)

  const orderBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  }
  orderBuilder.select.mockReturnValue(orderBuilder)
  orderBuilder.eq.mockReturnValue(orderBuilder)
  orderBuilder.order.mockReturnValue(orderBuilder)

  const insertBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  }
  insertBuilder.insert.mockReturnValue(insertBuilder)
  insertBuilder.select.mockReturnValue(insertBuilder)

  const from = vi.fn((table: string) => {
    if (table === 'events') return eventsBuilder
    if (table === 'event_fields') {
      return {
        select: orderBuilder.select,
        eq: orderBuilder.eq,
        order: orderBuilder.order,
        limit: orderBuilder.limit,
        insert: insertBuilder.insert,
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    mockEventsBuilder: eventsBuilder,
    mockOrderBuilder: orderBuilder,
    mockInsertBuilder: insertBuilder,
    mockFrom: from,
  }
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

import { useCreateEventFieldMutation } from '@/hooks/domain/event-fields/mutations/useCreateEventFieldMutation'

describe('useCreateEventFieldMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a field for a draft event and invalidates field list', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'draft' }, error: null })
    mockOrderBuilder.limit.mockResolvedValueOnce({ data: [{ display_order: 2 }] })
    mockInsertBuilder.single.mockResolvedValueOnce({
      data: { id: 'field-1', event_id: 'event-1', field_key: 'team_name' },
      error: null,
    })

    const { result, queryClient } = renderHookWithClient(() => useCreateEventFieldMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const created = await act(async () =>
      result.current.mutateAsync({
        event_id: 'event-1',
        field_key: 'team_name',
        label: 'Team Name',
        field_type: 'text',
        is_required: true,
        is_active: true,
        options: [],
        validation_rules: {},
        display_order: 0,
      }),
    )

    expect(created).toEqual({ id: 'field-1', event_id: 'event-1', field_key: 'team_name' })
    expect(mockInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: 'event-1',
        field_key: 'team_name',
        label: 'Team Name',
        display_order: 3,
      }),
    )

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminEventFieldsQueryKey('event-1') })
    })
  })

  it('rejects creating fields on non-draft events', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'published' }, error: null })

    const { result } = renderHookWithClient(() => useCreateEventFieldMutation())

    await expect(
      result.current.mutateAsync({
        event_id: 'event-1',
        field_key: 'team_name',
        label: 'Team Name',
        field_type: 'text',
        is_required: true,
        is_active: true,
        options: [],
        validation_rules: {},
        display_order: 0,
      }),
    ).rejects.toThrow('Cannot add fields to a published or archived event')
  })

  it('throws when loading event status fails', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: null, error: new Error('read failed') })

    const { result } = renderHookWithClient(() => useCreateEventFieldMutation())

    await expect(
      result.current.mutateAsync({
        event_id: 'event-1',
        field_key: 'team_name',
        label: 'Team Name',
        field_type: 'text',
        is_required: true,
        is_active: true,
        options: [],
        validation_rules: {},
        display_order: 0,
      }),
    ).rejects.toThrow('read failed')
  })

  it('starts display order at zero when no existing fields are present', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'draft' }, error: null })
    mockOrderBuilder.limit.mockResolvedValueOnce({ data: [] })
    mockInsertBuilder.single.mockResolvedValueOnce({
      data: { id: 'field-2', event_id: 'event-1', field_key: 'captain_name' },
      error: null,
    })

    const { result } = renderHookWithClient(() => useCreateEventFieldMutation())

    await act(async () => {
      await result.current.mutateAsync({
        event_id: 'event-1',
        field_key: 'captain_name',
        label: 'Captain Name',
        field_type: 'text',
        is_required: true,
        is_active: true,
        options: [],
        validation_rules: {},
        display_order: 0,
      })
    })

    expect(mockInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        display_order: 0,
      }),
    )
  })

  it('throws when insert fails', async () => {
    mockEventsBuilder.single.mockResolvedValueOnce({ data: { status: 'draft' }, error: null })
    mockOrderBuilder.limit.mockResolvedValueOnce({ data: [{ display_order: 0 }] })
    mockInsertBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error('insert failed'),
    })

    const { result } = renderHookWithClient(() => useCreateEventFieldMutation())

    await expect(
      result.current.mutateAsync({
        event_id: 'event-1',
        field_key: 'team_name',
        label: 'Team Name',
        field_type: 'text',
        is_required: true,
        is_active: true,
        options: [],
        validation_rules: {},
        display_order: 0,
      }),
    ).rejects.toThrow('insert failed')
  })
})
