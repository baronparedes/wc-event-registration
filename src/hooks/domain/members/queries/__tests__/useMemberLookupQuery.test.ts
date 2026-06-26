import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockLookupCaller, mockCreateEdgeFunctionCaller, mockLogger } = vi.hoisted(() => {
  const lookupCaller = vi.fn()

  return {
    mockLookupCaller: lookupCaller,
    mockCreateEdgeFunctionCaller: vi.fn(() => lookupCaller),
    mockLogger: {
      debug: vi.fn(),
      error: vi.fn(),
    },
  }
})

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')

  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
    logger: mockLogger,
  }
})

import { useMemberLookupQuery } from '@/hooks/domain/members/queries/useMemberLookupQuery'

describe('useMemberLookupQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('trims member id and returns profile result', async () => {
    mockLookupCaller.mockResolvedValueOnce({
      success: true,
      profile: {
        user_id: 'user-1',
        member_id: 'WC-001',
      },
      existing_registration: null,
    })

    const { result } = renderHookWithClient(() => useMemberLookupQuery())

    const response = await act(async () =>
      result.current.mutateAsync({ memberId: '  WC-001  ', eventSlug: 'sample-event' }),
    )

    expect(mockLookupCaller).toHaveBeenCalledWith({
      memberId: 'WC-001',
      eventSlug: 'sample-event',
    })
    expect(response).toEqual({
      profile: {
        user_id: 'user-1',
        member_id: 'WC-001',
      },
      existing_registration: null,
    })
  })

  it('returns empty result when member id is blank', async () => {
    const { result } = renderHookWithClient(() => useMemberLookupQuery())

    const response = await act(async () => result.current.mutateAsync({ memberId: '   ' }))

    expect(mockLookupCaller).not.toHaveBeenCalled()
    expect(response).toEqual({
      profile: null,
      existing_registration: null,
    })
  })

  it('surfaces error state when edge function throws', async () => {
    mockLookupCaller.mockRejectedValueOnce(new Error('lookup failed'))

    const { result } = renderHookWithClient(() => useMemberLookupQuery())

    await expect(result.current.mutateAsync({ memberId: 'WC-001' })).rejects.toThrow(
      'lookup failed',
    )

    await waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })
})
