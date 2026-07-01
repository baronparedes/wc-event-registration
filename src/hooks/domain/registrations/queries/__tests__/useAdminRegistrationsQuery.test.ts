import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { faker } from '@faker-js/faker'
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

// Test data factory
const createTestRegRow = (overrides?: Record<string, unknown>) => ({
  id: faker.string.uuid(),
  event_id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  status: 'submitted' as const,
  submitted_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

const createTestUserRow = (overrides?: Record<string, unknown>) => ({
  id: faker.string.uuid(),
  member_id: faker.helpers.slugify(faker.lorem.words(2)).toUpperCase(),
  full_name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.datatype.boolean() ? faker.phone.number() : null,
  metadata: { role: 'player', category: 'adult' },
  ...overrides,
})

describe('useAdminRegistrationsQuery', () => {
  let testEventId: string

  beforeEach(() => {
    // Generate stable event ID once per test to ensure queryKey doesn't change
    testEventId = faker.string.uuid()
    vi.clearAllMocks()
    mockRegistrationsBuilder.select.mockReturnValue(mockRegistrationsBuilder)
    mockRegistrationsBuilder.eq.mockReturnValue(mockRegistrationsBuilder)
    mockRegistrationsBuilder.order.mockReturnValue(mockRegistrationsBuilder)
    mockRegistrationsBuilder.range.mockReturnValue(mockRegistrationsBuilder)
    mockUsersBuilder.select.mockReturnValue(mockUsersBuilder)
    mockAnswersBuilder.select.mockReturnValue(mockAnswersBuilder)
  })

  it('returns mapped registration rows with member and answer counts', async () => {
    const regRow = createTestRegRow()
    const userRow = createTestUserRow({ id: regRow.user_id })
    mockRegistrationsBuilder.range.mockResolvedValueOnce({
      data: [regRow],
      error: null,
      count: 1,
    })

    mockUsersBuilder.in.mockResolvedValueOnce({
      data: [userRow],
      error: null,
    })

    mockAnswersBuilder.in.mockResolvedValueOnce({
      data: [{ registration_id: regRow.id }, { registration_id: regRow.id }],
      error: null,
    })

    const { result } = renderHookWithClient(() =>
      useAdminRegistrationsQuery(regRow.event_id, { pageSize: 25, cursor: null }),
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      items: [
        {
          ...regRow,
          member_id: userRow.member_id,
          full_name: userRow.full_name,
          email: userRow.email,
          phone: userRow.phone,
          role: 'player',
          category: 'adult',
          answer_count: 2,
        },
      ],
      hasMore: false,
      nextCursor: null,
      totalCount: 1,
      totalPages: 1,
    })
  })

  it('returns empty page when there are no registrations', async () => {
    const eventId = faker.string.uuid()
    mockRegistrationsBuilder.range.mockResolvedValueOnce({
      data: [],
      error: null,
      count: 0,
    })

    const { result } = renderHookWithClient(() =>
      useAdminRegistrationsQuery(eventId, { pageSize: 25, cursor: null }),
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

    const { result } = renderHookWithClient(() => useAdminRegistrationsQuery('evt-error'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('returns hasMore with next cursor when count exceeds current page size', async () => {
    const regRow = createTestRegRow()
    const userRow = createTestUserRow({
      id: regRow.user_id,
      metadata: { role: 123, category: null },
    })
    mockRegistrationsBuilder.range.mockResolvedValueOnce({
      data: [regRow],
      error: null,
      count: 3,
    })

    mockUsersBuilder.in.mockResolvedValueOnce({
      data: [userRow],
      error: null,
    })

    mockAnswersBuilder.in.mockResolvedValueOnce({
      data: [{ registration_id: regRow.id }],
      error: null,
    })

    const { result } = renderHookWithClient(() =>
      useAdminRegistrationsQuery(regRow.event_id, { pageSize: 1, cursor: null }),
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
    const regRow = createTestRegRow()
    mockRegistrationsBuilder.range.mockResolvedValueOnce({
      data: [regRow],
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
    const regRow = createTestRegRow()
    const userRow = createTestUserRow({ id: regRow.user_id })
    mockRegistrationsBuilder.range.mockResolvedValueOnce({
      data: [regRow],
      error: null,
      count: 1,
    })

    mockUsersBuilder.in.mockResolvedValueOnce({
      data: [userRow],
      error: null,
    })

    mockAnswersBuilder.in.mockResolvedValueOnce({
      data: null,
      error: new Error('answers failed'),
    })

    const { result } = renderHookWithClient(() => useAdminRegistrationsQuery(regRow.event_id))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  describe('with searchTerm', () => {
    it('filters registrations by matching user IDs when searchTerm is provided', async () => {
      const regRow = createTestRegRow()
      const userRow = createTestUserRow({ id: regRow.user_id })
      mockUsersBuilder.or.mockResolvedValueOnce({
        data: [{ id: userRow.id }],
        error: null,
      })

      mockRegistrationsBuilder.in.mockResolvedValueOnce({
        data: [regRow],
        error: null,
        count: 1,
      })

      mockUsersBuilder.in.mockResolvedValueOnce({
        data: [userRow],
        error: null,
      })

      mockAnswersBuilder.in.mockResolvedValueOnce({
        data: [{ registration_id: regRow.id }, { registration_id: regRow.id }],
        error: null,
      })

      const { result } = renderHookWithClient(() =>
        useAdminRegistrationsQuery(regRow.event_id, {
          pageSize: 25,
          cursor: null,
          searchTerm: 'Jane',
        }),
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockUsersBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('full_name.ilike.%Jane%'),
      )
      expect(result.current.data?.items).toHaveLength(1)
      expect(result.current.data?.items[0]).toMatchObject({ full_name: userRow.full_name })
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
        useAdminRegistrationsQuery(testEventId, {
          pageSize: 25,
          cursor: null,
          searchTerm: 'Jane',
        }),
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })

    it('trims whitespace from searchTerm before querying', async () => {
      const regRow = createTestRegRow()
      const userRow = createTestUserRow({ id: regRow.user_id })
      mockUsersBuilder.or.mockResolvedValueOnce({
        data: [{ id: userRow.id }],
        error: null,
      })

      mockRegistrationsBuilder.in.mockResolvedValueOnce({
        data: [regRow],
        error: null,
        count: 1,
      })

      mockUsersBuilder.in.mockResolvedValueOnce({ data: [userRow], error: null })
      mockAnswersBuilder.in.mockResolvedValueOnce({ data: [], error: null })

      const { result } = renderHookWithClient(() =>
        useAdminRegistrationsQuery(regRow.event_id, {
          pageSize: 25,
          cursor: null,
          searchTerm: '  Jane  ',
        }),
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
