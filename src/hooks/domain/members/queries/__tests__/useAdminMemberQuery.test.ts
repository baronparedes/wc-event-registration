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

import { useAdminMemberQuery } from '@/hooks/domain/members/queries/useAdminMemberQuery'

describe('useAdminMemberQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapped member record', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'user-1',
        member_id: 'WC-001',
        full_name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        nickname: 'J',
        email: 'jane@example.com',
        phone: null,
        date_of_birth: null,
        metadata: { role: 'player', category: 'adult' },
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    })

    const { result } = renderHookWithClient(() => useAdminMemberQuery('user-1'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      id: 'user-1',
      member_id: 'WC-001',
      full_name: 'Jane Doe',
      first_name: 'Jane',
      last_name: 'Doe',
      nickname: 'J',
      email: 'jane@example.com',
      phone: null,
      date_of_birth: null,
      role: 'player',
      category: 'adult',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
  })

  it('returns error state when member is not found', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const { result } = renderHookWithClient(() => useAdminMemberQuery('missing-user'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('returns empty role/category when metadata values are not strings', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'user-2',
        member_id: 'WC-002',
        full_name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        nickname: null,
        email: null,
        phone: null,
        date_of_birth: null,
        metadata: { role: 123, category: false },
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    })

    const { result } = renderHookWithClient(() => useAdminMemberQuery('user-2'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.role).toBe('')
    expect(result.current.data?.category).toBe('')
  })

  it('returns query error state when the users query fails', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('query failed'),
    })

    const { result } = renderHookWithClient(() => useAdminMemberQuery('user-3'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('stays idle when member ID is missing', () => {
    const { result } = renderHookWithClient(() => useAdminMemberQuery(undefined))

    expect(result.current.isPending).toBe(true)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
