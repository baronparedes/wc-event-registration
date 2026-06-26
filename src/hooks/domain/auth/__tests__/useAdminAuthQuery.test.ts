import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockFetchAdminAuthState } = vi.hoisted(() => ({
  mockFetchAdminAuthState: vi.fn(),
}))

vi.mock('@/lib/domain/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/domain/auth')>('@/lib/domain/auth')
  return {
    ...actual,
    fetchAdminAuthState: mockFetchAdminAuthState,
  }
})

import { useAdminAuthQuery } from '@/hooks/domain/auth/useAdminAuthQuery'

describe('useAdminAuthQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns admin auth state on success', async () => {
    mockFetchAdminAuthState.mockResolvedValueOnce({
      isAuthenticated: true,
      session: { user: { id: 'auth-1' } },
      adminRole: 'admin',
    })

    const { result } = renderHookWithClient(() => useAdminAuthQuery())

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      isAuthenticated: true,
      session: { user: { id: 'auth-1' } },
      adminRole: 'admin',
    })
  })

  it('returns query error state when auth fetch fails', async () => {
    mockFetchAdminAuthState.mockRejectedValueOnce(new Error('auth failed'))

    const { result } = renderHookWithClient(() => useAdminAuthQuery())

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })
})
