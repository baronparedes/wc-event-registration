import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockSignInWithPassword, mockSignOut, mockFetchAdminAuthState } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignOut: vi.fn(),
  mockFetchAdminAuthState: vi.fn(),
}))

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')
  return {
    ...actual,
    supabase: {
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signOut: mockSignOut,
      },
    },
  }
})

vi.mock('@/lib/domain/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/domain/auth')>('@/lib/domain/auth')
  return {
    ...actual,
    fetchAdminAuthState: mockFetchAdminAuthState,
  }
})

import { ADMIN_AUTH_QUERY_KEY } from '@/lib/domain/auth'
import { useAdminLoginMutation } from '@/hooks/domain/auth/useAdminLoginMutation'

describe('useAdminLoginMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signs in, returns auth state, and invalidates auth query', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null })
    mockFetchAdminAuthState.mockResolvedValueOnce({
      isAuthenticated: true,
      session: { user: { id: 'auth-1' } },
      adminRole: 'admin',
    })

    const { result, queryClient } = renderHookWithClient(() => useAdminLoginMutation())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const authState = await act(async () =>
      result.current.mutateAsync({ email: 'admin@example.com', password: 'secret' }),
    )

    expect(authState.isAuthenticated).toBe(true)
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'secret',
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_AUTH_QUERY_KEY })
    })
  })

  it('signs out and throws when account is not authorized', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null })
    mockFetchAdminAuthState.mockResolvedValueOnce({
      isAuthenticated: false,
      session: { user: { id: 'auth-1' } },
      adminRole: null,
    })
    mockSignOut.mockResolvedValueOnce({ error: null })

    const { result } = renderHookWithClient(() => useAdminLoginMutation())

    await expect(
      result.current.mutateAsync({ email: 'user@example.com', password: 'secret' }),
    ).rejects.toThrow('This account is not authorized as an admin.')

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('throws immediately when signInWithPassword returns an auth error', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: new Error('invalid login') })

    const { result } = renderHookWithClient(() => useAdminLoginMutation())

    await expect(
      result.current.mutateAsync({ email: 'bad@example.com', password: 'wrong' }),
    ).rejects.toThrow('invalid login')

    expect(mockFetchAdminAuthState).not.toHaveBeenCalled()
    expect(mockSignOut).not.toHaveBeenCalled()
  })
})
