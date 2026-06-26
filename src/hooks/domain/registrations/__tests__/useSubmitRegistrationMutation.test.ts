import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockSubmitCaller, mockCreateEdgeFunctionCaller, mockLogger, mockToastError } = vi.hoisted(
  () => {
    const submitCaller = vi.fn()

    return {
      mockSubmitCaller: submitCaller,
      mockCreateEdgeFunctionCaller: vi.fn(() => submitCaller),
      mockLogger: {
        debug: vi.fn(),
        error: vi.fn(),
      },
      mockToastError: vi.fn(),
    }
  },
)

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')

  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
    logger: mockLogger,
  }
})

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
  },
}))

import { useSubmitRegistrationMutation } from '@/hooks/domain/registrations/mutations/useSubmitRegistrationMutation'

describe('useSubmitRegistrationMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls submit-registration with the expected payload and returns success', async () => {
    mockSubmitCaller.mockResolvedValueOnce({
      success: true,
      registration_id: 'reg-1',
      status: 'submitted',
      is_new: true,
      message: 'Submitted',
    })

    const { result } = renderHookWithClient(() => useSubmitRegistrationMutation())

    const payload = {
      event_slug: 'sample-event',
      member_id: 'WC-001',
      responses: { team_name: 'A-Team' },
      idempotency_key: '3f223867-51bf-4fd7-bb28-dbd13d74d3be',
    }

    const mutationResult = await act(async () => result.current.mutateAsync(payload))

    expect(mockSubmitCaller).toHaveBeenCalledWith(payload)
    expect(mutationResult.success).toBe(true)
    if (mutationResult.success) {
      expect(mutationResult.registration_id).toBe('reg-1')
    }
  })

  it('invalidates the public event query on success', async () => {
    mockSubmitCaller.mockResolvedValueOnce({
      success: true,
      registration_id: 'reg-2',
      status: 'updated',
      is_new: false,
      message: 'Updated',
    })

    const { result, queryClient } = renderHookWithClient(() => useSubmitRegistrationMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync({
        event_slug: 'sample-event',
        member_id: 'WC-001',
        responses: { team_name: 'A-Team' },
        idempotency_key: '8d3f7f82-cbc3-4f5d-a959-574097be3201',
      })
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['public-event-by-slug', 'sample-event'],
      })
    })
  })

  it('shows a toast when the mutation throws an error', async () => {
    mockSubmitCaller.mockRejectedValueOnce(new Error('Network failure'))

    const { result } = renderHookWithClient(() => useSubmitRegistrationMutation())

    await expect(
      result.current.mutateAsync({
        event_slug: 'sample-event',
        member_id: 'WC-001',
        responses: {},
        idempotency_key: 'd5a26f9d-6c3f-4055-bcbc-b44753bd54b3',
      }),
    ).rejects.toThrow('Network failure')

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Failed to submit registration. Please try again.',
      )
    })
    expect(mockLogger.error).toHaveBeenCalled()
  })
})
