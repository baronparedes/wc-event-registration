import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { ADMIN_MEMBER_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMemberQuery'
import { ADMIN_MEMBERS_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersQuery'

const { mockUpdateMemberIdCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const updateMemberIdCaller = vi.fn()
  return {
    mockUpdateMemberIdCaller: updateMemberIdCaller,
    mockCreateEdgeFunctionCaller: vi.fn(() => updateMemberIdCaller),
  }
})

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')
  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  }
})

import { useUpdateMemberIdMutation } from '@/hooks/domain/members/mutations/useUpdateMemberIdMutation'

describe('useUpdateMemberIdMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('trims and updates member id, then invalidates list/detail queries', async () => {
    const userId = faker.string.uuid()
    mockUpdateMemberIdCaller.mockResolvedValueOnce({
      success: true,
      id: userId,
      member_id: 'WC-002',
    })

    const { result, queryClient } = renderHookWithClient(() => useUpdateMemberIdMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync({ id: userId, newMemberId: '  WC-002  ' })
    })

    expect(mockUpdateMemberIdCaller).toHaveBeenCalledWith({
      id: userId,
      member_id: 'WC-002',
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBERS_QUERY_KEY() })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBER_QUERY_KEY(userId) })
    })
  })

  it('throws error from edge function when member id is empty', async () => {
    mockUpdateMemberIdCaller.mockRejectedValueOnce(new Error('Member ID cannot be empty'))

    const { result } = renderHookWithClient(() => useUpdateMemberIdMutation())

    await expect(
      result.current.mutateAsync({ id: faker.string.uuid(), newMemberId: '   ' }),
    ).rejects.toThrow('Member ID cannot be empty')
  })

  it('throws when updating member id fails', async () => {
    mockUpdateMemberIdCaller.mockRejectedValueOnce(new Error('update failed'))

    const { result } = renderHookWithClient(() => useUpdateMemberIdMutation())

    await expect(
      result.current.mutateAsync({ id: faker.string.uuid(), newMemberId: 'WC-009' }),
    ).rejects.toThrow('update failed')
  })
})
