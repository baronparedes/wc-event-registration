import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import { ADMIN_REGISTRATIONS_QUERY_KEY } from '@/hooks/domain/registrations/queries/useAdminRegistrationsQuery'

const { mockEdgeCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => ({
  mockEdgeCaller: vi.fn(),
  mockCreateEdgeFunctionCaller: vi.fn(),
}))

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')

  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  }
})

import { useCancelRegistrationMutation } from '@/hooks/domain/registrations/mutations/useCancelRegistrationMutation'

describe('useCancelRegistrationMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateEdgeFunctionCaller.mockReturnValue(mockEdgeCaller)
  })

  it('calls cancel-registration with expected payload', async () => {
    mockEdgeCaller.mockResolvedValueOnce({
      success: true,
      registration_id: 'reg-1',
    })

    const { result } = renderHookWithClient(() => useCancelRegistrationMutation('event-1'))

    await act(async () => {
      await result.current.mutateAsync({
        registration_id: 'reg-1',
        reason: 'No longer attending',
      })
    })

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('cancel-registration')
    expect(mockEdgeCaller).toHaveBeenCalledWith({
      registration_id: 'reg-1',
      reason: 'No longer attending',
    })
  })

  it('invalidates admin registrations query on success', async () => {
    mockEdgeCaller.mockResolvedValueOnce({
      success: true,
      registration_id: 'reg-2',
    })

    const { result, queryClient } = renderHookWithClient(() =>
      useCancelRegistrationMutation('event-1'),
    )
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync({ registration_id: 'reg-2' })
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ADMIN_REGISTRATIONS_QUERY_KEY('event-1'),
      })
    })
  })

  it('throws an error when edge function returns success false', async () => {
    mockEdgeCaller.mockResolvedValueOnce({
      success: false,
      error: 'Already cancelled',
      error_code: 'already_cancelled',
    })

    const { result } = renderHookWithClient(() => useCancelRegistrationMutation('event-1'))

    await expect(
      result.current.mutateAsync({
        registration_id: 'reg-3',
      }),
    ).rejects.toThrow('Already cancelled')
  })
})
