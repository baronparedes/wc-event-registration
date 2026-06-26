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
    }
    registrationsBuilder.select.mockReturnValue(registrationsBuilder)
    registrationsBuilder.eq.mockReturnValue(registrationsBuilder)
    registrationsBuilder.order.mockReturnValue(registrationsBuilder)

    const usersBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      in: vi.fn(),
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

describe('useAdminRegistrationsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapped registration rows with member and answer counts', async () => {
    mockRegistrationsBuilder.range.mockResolvedValueOnce({
      data: [
        {
          id: 'reg-1',
          event_id: 'evt-1',
          user_id: 'user-1',
          status: 'submitted',
          submitted_at: '2026-06-26T10:00:00.000Z',
          updated_at: '2026-06-26T10:00:00.000Z',
        },
      ],
      error: null,
      count: 1,
    })

    mockUsersBuilder.in.mockResolvedValueOnce({
      data: [
        {
          id: 'user-1',
          member_id: 'WC-001',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
          phone: null,
          metadata: { role: 'player', category: 'adult' },
        },
      ],
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
      items: [
        {
          id: 'reg-1',
          event_id: 'evt-1',
          user_id: 'user-1',
          status: 'submitted',
          submitted_at: '2026-06-26T10:00:00.000Z',
          updated_at: '2026-06-26T10:00:00.000Z',
          member_id: 'WC-001',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
          phone: null,
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
})
