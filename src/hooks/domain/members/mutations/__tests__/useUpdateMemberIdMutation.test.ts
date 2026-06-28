import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { ADMIN_MEMBER_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMemberQuery'
import { ADMIN_MEMBERS_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersQuery'

const { mockUpdateBuilder, mockFrom } = vi.hoisted(() => {
  const updateBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    update: vi.fn(),
    eq: vi.fn(),
  }
  updateBuilder.update.mockReturnValue(updateBuilder)

  return {
    mockUpdateBuilder: updateBuilder,
    mockFrom: vi.fn(() => updateBuilder),
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

import { useUpdateMemberIdMutation } from '@/hooks/domain/members/mutations/useUpdateMemberIdMutation'

describe('useUpdateMemberIdMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateBuilder.eq.mockResolvedValue({ error: null })
  })

  it('trims and updates member id, then invalidates list/detail queries', async () => {
    const { result, queryClient } = renderHookWithClient(() => useUpdateMemberIdMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync({ id: 'user-1', newMemberId: '  WC-002  ' })
    })

    expect(mockUpdateBuilder.update).toHaveBeenCalledWith({ member_id: 'WC-002' })
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBERS_QUERY_KEY() })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBER_QUERY_KEY('user-1') })
    })
  })

  it('rejects empty member id input', async () => {
    const { result } = renderHookWithClient(() => useUpdateMemberIdMutation())

    await expect(result.current.mutateAsync({ id: 'user-1', newMemberId: '   ' })).rejects.toThrow(
      'Member ID cannot be empty',
    )
  })

  it('throws when updating member id fails', async () => {
    mockUpdateBuilder.eq.mockResolvedValueOnce({ error: new Error('update failed') })

    const { result } = renderHookWithClient(() => useUpdateMemberIdMutation())

    await expect(
      result.current.mutateAsync({ id: 'user-1', newMemberId: 'WC-009' }),
    ).rejects.toThrow('update failed')
  })
})
