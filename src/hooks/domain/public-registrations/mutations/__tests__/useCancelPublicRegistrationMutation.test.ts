import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const caller = vi.fn()
  return {
    mockCaller: caller,
    mockCreateEdgeFunctionCaller: vi.fn(() => caller),
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

import { useCancelPublicRegistrationMutation } from '@/hooks/domain/public-registrations/mutations/useCancelPublicRegistrationMutation'

describe('useCancelPublicRegistrationMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cancels registration and invalidates related public registration queries', async () => {
    const eventId = faker.string.uuid()
    const registrationId = faker.string.uuid()

    mockCaller.mockResolvedValueOnce({ success: true, registration_id: registrationId })

    const { result, queryClient } = renderHookWithClient(() =>
      useCancelPublicRegistrationMutation(eventId),
    )
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync({ registration_id: registrationId })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['admin-public-registrations', eventId],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['publicRegistrationCount', eventId],
    })
  })

  it('throws edge function error message when cancellation fails', async () => {
    const eventId = faker.string.uuid()
    mockCaller.mockResolvedValueOnce({ success: false, error: 'Cannot cancel' })

    const { result } = renderHookWithClient(() => useCancelPublicRegistrationMutation(eventId))

    await expect(
      result.current.mutateAsync({ registration_id: faker.string.uuid() }),
    ).rejects.toThrow('Cannot cancel')
  })

  it('throws fallback error message when failure response has no error field', async () => {
    const eventId = faker.string.uuid()
    mockCaller.mockResolvedValueOnce({ success: false })

    const { result } = renderHookWithClient(() => useCancelPublicRegistrationMutation(eventId))

    await expect(
      result.current.mutateAsync({ registration_id: faker.string.uuid() }),
    ).rejects.toThrow('Failed to cancel public registration')
  })
})
