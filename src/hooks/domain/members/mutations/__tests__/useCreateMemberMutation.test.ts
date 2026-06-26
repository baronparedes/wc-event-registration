import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { ADMIN_MEMBERS_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersQuery'

const { mockCreateCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const createCaller = vi.fn()
  return {
    mockCreateCaller: createCaller,
    mockCreateEdgeFunctionCaller: vi.fn(() => createCaller),
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

import { useCreateMemberMutation } from '@/hooks/domain/members/mutations/useCreateMemberMutation'

describe('useCreateMemberMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a member and invalidates admin members query', async () => {
    mockCreateCaller.mockResolvedValueOnce({
      success: true,
      id: 'user-1',
      member_id: 'WC-001',
      full_name: 'Jane Doe',
    })

    const { result, queryClient } = renderHookWithClient(() => useCreateMemberMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const response = await act(async () =>
      result.current.mutateAsync({
        member_id: 'WC-001',
        first_name: 'Jane',
        last_name: 'Doe',
        nickname: '',
        email: 'jane@example.com',
        phone: '',
        date_of_birth: '',
        role: 'player',
        category: 'adult',
      }),
    )

    expect(response.member_id).toBe('WC-001')
    expect(mockCreateCaller).toHaveBeenCalledWith(
      expect.objectContaining({ member_id: 'WC-001', first_name: 'Jane' }),
    )

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBERS_QUERY_KEY() })
    })
  })
})
