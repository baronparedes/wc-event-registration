import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { ADMIN_MEMBER_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMemberQuery'
import { ADMIN_MEMBERS_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersQuery'

const { mockSelectBuilder, mockUpdateBuilder, mockFrom } = vi.hoisted(() => {
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

  const from = vi.fn((table: string) => {
    if (table !== 'users') throw new Error(`Unexpected table: ${table}`)
    return {
      select: selectBuilder.select,
      eq: selectBuilder.eq,
      maybeSingle: selectBuilder.maybeSingle,
      update: updateBuilder.update,
    }
  })

  return { mockSelectBuilder: selectBuilder, mockUpdateBuilder: updateBuilder, mockFrom: from }
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

import { useUpdateMemberMutation } from '@/hooks/domain/members/mutations/useUpdateMemberMutation'

describe('useUpdateMemberMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateBuilder.eq.mockResolvedValue({ error: null })
  })

  it('updates member fields and invalidates list/detail queries', async () => {
    const userId = faker.string.uuid()
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const email = faker.internet.email({ firstName, lastName })
    mockSelectBuilder.maybeSingle.mockResolvedValueOnce({
      data: { metadata: { role: 'old-role', category: 'old-category', other: 'keep' } },
      error: null,
    })

    const { result, queryClient } = renderHookWithClient(() => useUpdateMemberMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync({
        id: userId,
        full_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        nickname: '',
        email,
        phone: '',
        date_of_birth: '',
        role: 'player',
        category: '',
      })
    })

    expect(mockUpdateBuilder.update).toHaveBeenCalledWith({
      full_name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      nickname: null,
      email,
      phone: null,
      date_of_birth: null,
      metadata: { other: 'keep', role: 'player' },
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBERS_QUERY_KEY() })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBER_QUERY_KEY(userId) })
    })
  })

  it('throws when member does not exist', async () => {
    mockSelectBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHookWithClient(() => useUpdateMemberMutation())

    await expect(
      result.current.mutateAsync({
        id: faker.string.uuid(),
        full_name: faker.person.fullName(),
        first_name: '',
        last_name: '',
        nickname: '',
        email: '',
        phone: '',
        date_of_birth: '',
        role: '',
        category: '',
      }),
    ).rejects.toThrow('Member not found')
  })

  it('throws when member metadata lookup fails', async () => {
    mockSelectBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('read failed'),
    })

    const { result } = renderHookWithClient(() => useUpdateMemberMutation())

    await expect(
      result.current.mutateAsync({
        id: faker.string.uuid(),
        full_name: faker.person.fullName(),
        first_name: '',
        last_name: '',
        nickname: '',
        email: '',
        phone: '',
        date_of_birth: '',
        role: '',
        category: '',
      }),
    ).rejects.toThrow('read failed')
  })

  it('throws when member update fails', async () => {
    mockSelectBuilder.maybeSingle.mockResolvedValueOnce({
      data: { metadata: { role: 'player' } },
      error: null,
    })
    mockUpdateBuilder.eq.mockResolvedValueOnce({ error: new Error('update failed') })

    const { result } = renderHookWithClient(() => useUpdateMemberMutation())

    await expect(
      result.current.mutateAsync({
        id: faker.string.uuid(),
        full_name: faker.person.fullName(),
        first_name: '',
        last_name: '',
        nickname: '',
        email: '',
        phone: '',
        date_of_birth: '',
        role: 'captain',
        category: '',
      }),
    ).rejects.toThrow('update failed')
  })

  it('removes role and category metadata when values are blank', async () => {
    mockSelectBuilder.maybeSingle.mockResolvedValueOnce({
      data: { metadata: { role: 'player', category: 'adult', keep: 'yes' } },
      error: null,
    })

    const { result } = renderHookWithClient(() => useUpdateMemberMutation())

    await act(async () => {
      await result.current.mutateAsync({
        id: faker.string.uuid(),
        full_name: faker.person.fullName(),
        first_name: '',
        last_name: '',
        nickname: '',
        email: '',
        phone: '',
        date_of_birth: '',
        role: '   ',
        category: '   ',
      })
    })

    expect(mockUpdateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { keep: 'yes' },
      }),
    )
  })
})
