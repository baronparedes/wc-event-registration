import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  }

  queryBuilder.select.mockReturnValue(queryBuilder)
  queryBuilder.eq.mockReturnValue(queryBuilder)

  return {
    mockQueryBuilder: queryBuilder,
    mockFrom: vi.fn(() => queryBuilder),
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

import { useAttendanceSettingsQuery } from '@/hooks/domain/attendance/queries/useAttendanceSettingsQuery'

describe('useAttendanceSettingsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns attendance settings when a row exists', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        event_id: 'event-1',
        attendance_enabled: true,
        walk_in_mode_enabled: false,
        timeslot_enabled: true,
        timeslots: ['2026-07-10T10:30+08:00'],
        updated_at: '2026-07-01T01:00:00.000Z',
      },
      error: null,
    })

    const { result } = renderHookWithClient(() => useAttendanceSettingsQuery('event-1'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      event_id: 'event-1',
      attendance_enabled: true,
      walk_in_mode_enabled: false,
      timeslot_enabled: true,
      timeslots: ['2026-07-10T10:30+08:00'],
      updated_at: '2026-07-01T01:00:00.000Z',
    })
  })

  it('returns default settings when no row exists yet', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHookWithClient(() => useAttendanceSettingsQuery('event-2'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(
      expect.objectContaining({
        event_id: 'event-2',
        attendance_enabled: false,
        walk_in_mode_enabled: false,
        timeslot_enabled: false,
        timeslots: [],
      }),
    )
    expect(result.current.data?.updated_at).toEqual(expect.any(String))
  })

  it('returns an error state when loading settings fails', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('settings failed'),
    })

    const { result } = renderHookWithClient(() => useAttendanceSettingsQuery('event-3'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('stays idle and does not query when event ID is missing', () => {
    const { result } = renderHookWithClient(() => useAttendanceSettingsQuery(undefined))

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.isSuccess).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
