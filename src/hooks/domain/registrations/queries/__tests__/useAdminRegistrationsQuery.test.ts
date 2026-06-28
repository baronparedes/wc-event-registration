import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockRegistrationsBuilder, mockUsersBuilder, mockAnswersBuilder, mockFrom } = vi.hoisted(
  () => {
    const registrationsBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
      in: vi.fn(),
    }
    registrationsBuilder.select.mockReturnValue(registrationsBuilder)
    registrationsBuilder.eq.mockReturnValue(registrationsBuilder)
    registrationsBuilder.order.mockReturnValue(registrationsBuilder)
    registrationsBuilder.range.mockReturnValue(registrationsBuilder)

    const usersBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      in: vi.fn(),
      or: vi.fn(),
    }
    usersBuilder.select.mockReturnValue(usersBuilder)

    const answersBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      in: vi.fn(),
    }
    answersBuilder.select.mockReturnValue(answersBuilder)

    const from = vi.fn((table: string) => {
      if (table === 'registrations') return registrationsBuilder
      if (table === 'users') return usersBuilder
      if (table === 'registration_answers') return answersBuilder
      throw new Error(`Unexpected table: ${table}`)
    })

    return {
      mockRegistrationsBuilder: registrationsBuilder,
      mockUsersBuilder: usersBuilder,
      mockAnswersBuilder: answersBuilder,
      mockFrom: from,
    }
  },
)

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')

  return {
    ...actual,
    decodeOffsetCursor: vi.fn((cursor: string | null) => (cursor ? Number(cursor) : 0)),
    getTotalPages: vi.fn((totalCount: number, pageSize: number) =>
      Math.ceil(totalCount / pageSize),
    ),
    supabase: {
      from: mockFrom,
    },
  }
})

import { useAdminRegistrationsQuery } from '@/hooks/domain/registrations/queries/useAdminRegistrationsQuery'

const REG_ROW = {
  id: 'reg-1',
  event_id: 'evt-1',
  user_id: 'user-1',
  status: 'submitted',
  submitted_at: '2026-06-26T10:00:00.000Z',
  updated_at: '2026-06-26T10:00:00.000Z',
}

const USER_ROW = {
  id: 'user-1',
  member_id: 'WC-001',
  full_name: 'Jane Doe',
  email: 'jane@example.com',
  phone: null,
  metadata: { role: 'player', category: 'adult' },
}

const EXPECTED_ITEM = {
  ...REG_ROW,
  member_id: 'WC-001',
  full_name: 'Jane Doe',
  email: 'jane@example.com',
  phone: null,
  role: 'player',
  category: 'adult',
  answer_count: 2,
}

describe('useAdminRegistrationsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRegistrationsBuilder.select.mockReturnValue(mockRegistrationsBuilder)
    mockRegistrationsBuilder.eq.mockReturnValue(mockRegistrationsBuilder)
    mockRegistrationsBuilder.order.mockReturnValue(mockRegistrationsBuilder)
    mockRegistrationsBuilder.range.mockReturnValue(mockRegistrationsBuilder)
    mockUsersBuilder.select.mockReturnValue(mockUsersBuilder)
    mockAnswersBuilder.select.mockReturnValue(mockAnswersBuilder)
  })

  it('returns mapped registration rows with member and answer counts', async () => {
    mockRegistrationsBuilder.range.mockResolvedValueOnce({
      data: [REG_ROW],
      error: null,
      count: 1,
    })

    mockUsersBuilder.in.mockResolvedValueOnce({
      data: [USER_ROW],
      error: null,
    })

    mockAnswersBuilder.in.mockResolvedValueOnce({
      data: [{ registration_id: 'reg-1' }, { registration_id: 'reg-1' }],
      error: null,
    })

    const { result } = renderHookWithClient(() =>
      useAdminRegistrationsQuery('evt-1', { pageSize: 25, cursor: null }),
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      items: [EXPECTED_ITEM],
      hasMore: false,
      nextCursor: null,
      totalCount: 1,
      totalPages: 1,
    })
  })

  it('returns empty page when there are no registrations', async () => {
    mockRegistrationsBuilder.range.mockResolvedValueOnce({
      data: [],
      error: null,
      count: 0,
    })

    const { result } = renderHookWithClient(() =>
      useAdminRegistrationsQuery('evt-1', { pageSize: 25, cursor: null }),
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      items: [],
      hasMore: false,
      nextCursor: null,
      totalCount: 0,
      totalPages: 0,
    })
  })

  it('returns query error state when registration query fails', async () => {
    mockRegistrationsBuilder.range.mockResolvedValueOnce({
      data: null,
      error: new Error('registrations failed'),
      count: null,
    })

    const { result } = renderHookWithClient(() => useAdminRegistrationsQuery('evt-1'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('returns hasMore with next cursor when count exceeds current page size', async () => {
    mockRegistrationsBuilder.range.mockResolvedValueOnce({
      data: [REG_ROW],
      error: null,
      count: 3,
    })

    mockUsersBuilder.in.mockResolvedValueOnce({
      data: [{ ...USER_ROW, metadata: { role: 123, category: null } }],
      error: null,
    })

    mockAnswersBuilder.in.mockResolvedValueOnce({
      data: [{ registration_id: 'reg-1' }],
      error: null,
    })

    const { result } = renderHookWithClient(() =>
      useAdminRegistrationsQuery('evt-1', { pageSize: 1, cursor: null }),
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.hasMore).toBe(true)
    expect(result.current.data?.nextCursor).toBe('1')
    expect(result.current.data?.totalPages).toBe(3)
    expect(result.current.data?.items[0]).toMatchObject({ role: '', category: '' })
  })

  it('returns error state when user detail query fails', async () => {
    mockRegistrationsBuilder.range.mockResolvedValueOnce({
      data: [REG_ROW],
      error: null,
      count: 1,
    })

    mockUsersBuilder.in.mockResolvedValueOnce({
      data: null,
      error: new Error('users failed'),
    })

    const { result } = renderHookWithClient(() => useAdminRegistrationsQuery('evt-1'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('returns error state when answer count query fails', async () => {
    mockRegistrationsBuilder.range.mockResolvedValueOnce({
      data: [REG_ROW],
      error: null,
      count: 1,
    })

    mockUsersBuilder.in.mockResolvedValueOnce({
      data: [USER_ROW],
      error: null,
    })

    mockAnswersBuilder.in.mockResolvedValueOnce({
      data: null,
      error: new Error('answers failed'),
    })

    const { result } = renderHookWithClient(() => useAdminRegistrationsQuery('evt-1'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  describe('with searchTerm', () => {
    it('filters registrations by matching user IDs when searchTerm is provided', async () => {
      mockUsersBuilder.or.mockResolvedValueOnce({
        data: [{ id: 'user-1' }],
        error: null,
      })

      mockRegistrationsBuilder.in.mockResolvedValueOnce({
        data: [REG_ROW],
        error: null,
        count: 1,
      })

      mockUsersBuilder.in.mockResolvedValueOnce({
        data: [USER_ROW],
        error: null,
      })

      mockAnswersBuilder.in.mockResolvedValueOnce({
        data: [{ registration_id: 'reg-1' }, { registration_id: 'reg-1' }],
        error: null,
      })

      const { result } = renderHookWithClient(() =>
        useAdminRegistrationsQuery('evt-1', { pageSize: 25, cursor: null, searchTerm: 'Jane' }),
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockUsersBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('full_name.ilike.%Jane%'),
      )
      expect(result.current.data?.items).toHaveLength(1)
      expect(result.current.data?.items[0]).toMatchObject({ full_name: 'Jane Doe' })
    })

    it('returns empty result immediately when no users match the search', async () => {
      mockUsersBuilder.or.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const { result } = renderHookWithClient(() =>
        useAdminRegistrationsQuery('evt-1', {
          pageSize: 25,
          cursor: null,
          searchTerm: 'nonexistent',
        }),
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual({
        items: [],
        nextCursor: null,
        hasMore: false,
        totalCount: 0,
        totalPages: 0,
      })
      expect(mockRegistrationsBuilder.in).not.toHaveBeenCalled()
    })

    it('returns error state when user search query fails', async () => {
      mockUsersBuilder.or.mockResolvedValueOnce({
        data: null,
        error: new Error('user search failed'),
      })

      const { result } = renderHookWithClient(() =>
        useAdminRegistrationsQuery('evt-1', { pageSize: 25, cursor: null, searchTerm: 'Jane' }),
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })

    it('trims whitespace from searchTerm before querying', async () => {
      mockUsersBuilder.or.mockResolvedValueOnce({
        data: [{ id: 'user-1' }],
        error: null,
      })

      mockRegistrationsBuilder.in.mockResolvedValueOnce({
        data: [REG_ROW],
        error: null,
        count: 1,
      })

      mockUsersBuilder.in.mockResolvedValueOnce({ data: [USER_ROW], error: null })
      mockAnswersBuilder.in.mockResolvedValueOnce({ data: [], error: null })

      const { result } = renderHookWithClient(() =>
        useAdminRegistrationsQuery('evt-1', { pageSize: 25, cursor: null, searchTerm: '  Jane  ' }),
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockUsersBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('full_name.ilike.%Jane%'),
      )
    })
  })
})
