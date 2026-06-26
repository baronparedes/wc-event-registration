import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockNavigate,
  mockUseAdminAuthQuery,
  mockLoginMutateAsync,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAdminAuthQuery: vi.fn(),
  mockLoginMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

vi.mock('@/hooks/domain/auth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/auth')>('@/hooks/domain/auth')
  return {
    ...actual,
    useAdminAuthQuery: () => mockUseAdminAuthQuery(),
    useAdminLoginMutation: () => ({
      mutateAsync: mockLoginMutateAsync,
      isPending: false,
    }),
  }
})

import { AdminLoginPage } from '@/pages/admin/login'

describe('AdminLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: false },
      isLoading: false,
    })
    mockLoginMutateAsync.mockResolvedValue({ isAuthenticated: true })
  })

  it('submits admin credentials and navigates on success', async () => {
    render(<AdminLoginPage />)

    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: 'admin@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password *'), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(mockLoginMutateAsync).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'secret',
      })
    })

    expect(mockToastSuccess).toHaveBeenCalledWith('Welcome back. Admin access granted.')
    expect(mockNavigate).toHaveBeenCalledWith('/admin/events', { replace: true })
  })

  it('redirects authenticated admins immediately', () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true },
      isLoading: false,
    })

    render(<AdminLoginPage />)

    expect(mockNavigate).toHaveBeenCalledWith('/admin/events', { replace: true })
  })
})
