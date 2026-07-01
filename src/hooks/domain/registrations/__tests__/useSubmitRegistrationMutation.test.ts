import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { faker } from '@faker-js/faker'
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
    const registrationId = faker.string.uuid()
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase()
    const memberId = faker.helpers.slugify(faker.lorem.words(2)).toUpperCase()
    const idempotencyKey = faker.string.uuid()
    mockSubmitCaller.mockResolvedValueOnce({
      success: true,
      registration_id: registrationId,
      status: 'submitted',
      is_new: true,
      message: 'Submitted',
    })

    const { result } = renderHookWithClient(() => useSubmitRegistrationMutation())

    const payload = {
      event_slug: eventSlug,
      member_id: memberId,
      responses: { team_name: faker.company.name() },
      idempotency_key: idempotencyKey,
    }

    const mutationResult = await act(async () => result.current.mutateAsync(payload))

    expect(mockSubmitCaller).toHaveBeenCalledWith(payload)
    expect(mutationResult.success).toBe(true)
    if (mutationResult.success) {
      expect(mutationResult.registration_id).toBe(registrationId)
    }
  })

  it('invalidates the public event query on success', async () => {
    const registrationId = faker.string.uuid()
    const eventSlug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase()
    const memberId = faker.helpers.slugify(faker.lorem.words(2)).toUpperCase()
    const idempotencyKey = faker.string.uuid()
    mockSubmitCaller.mockResolvedValueOnce({
      success: true,
      registration_id: registrationId,
      status: 'updated',
      is_new: false,
      message: 'Updated',
    })

    const { result, queryClient } = renderHookWithClient(() => useSubmitRegistrationMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync({
        event_slug: eventSlug,
        member_id: memberId,
        responses: { team_name: faker.company.name() },
        idempotency_key: idempotencyKey,
      })
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['public-event-by-slug', eventSlug],
      })
    })
  })

  it('shows a toast when the mutation throws an error', async () => {
    mockSubmitCaller.mockRejectedValueOnce(new Error('Network failure'))

    const { result } = renderHookWithClient(() => useSubmitRegistrationMutation())

    await expect(
      result.current.mutateAsync({
        event_slug: faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
        member_id: faker.helpers.slugify(faker.lorem.words(2)).toUpperCase(),
        responses: {},
        idempotency_key: faker.string.uuid(),
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
