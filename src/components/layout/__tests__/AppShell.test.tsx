import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ROUTE_PATHS, TOAST_MESSAGES } from '@/config/constants'
import { AppShell } from '../AppShell'

const { mockUseAdminAuthQuery, mockMutateAsync, mockToastSuccess, mockToastError } = vi.hoisted(
  () => ({
    mockUseAdminAuthQuery: vi.fn(),
    mockMutateAsync: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
  }),
)

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => mockUseAdminAuthQuery(),
  useAdminLogoutMutation: () => ({ mutateAsync: mockMutateAsync }),
}))

function renderShell(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={<AppShell />}>
          <Route path="*" element={<div>Outlet Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutateAsync.mockResolvedValue(undefined)
  })

  it('renders sign in menu for unauthenticated users', () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: { isAuthenticated: false } })

    renderShell('/')

    fireEvent.click(screen.getByRole('button', { name: 'Admin' }))

    const signInLink = screen.getByRole('link', { name: 'Sign In' })
    expect(signInLink).toHaveAttribute('href', ROUTE_PATHS.adminLogin)
    fireEvent.click(signInLink)

    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument()
  })

  it('renders admin links for authenticated users and highlights admin path', () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: { isAuthenticated: true } })

    renderShell('/admin/events')

    const adminButton = screen.getByRole('button', { name: 'Admin' })
    expect(adminButton.className).toContain('bg-primary/10')

    fireEvent.click(adminButton)

    const eventsLinks = screen.getAllByRole('link', { name: 'Events' })
    expect(eventsLinks[1]).toHaveAttribute('href', ROUTE_PATHS.adminEvents)
    const membersLink = screen.getByRole('link', { name: 'Members' })
    expect(membersLink).toHaveAttribute('href', ROUTE_PATHS.adminMembers)

    fireEvent.click(eventsLinks[1])
    fireEvent.click(adminButton)
    fireEvent.click(screen.getByRole('link', { name: 'Members' }))

    expect(screen.queryByRole('link', { name: 'Members' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
  })

  it('handles successful sign out', async () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: { isAuthenticated: true } })

    renderShell('/')

    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
      expect(mockToastSuccess).toHaveBeenCalledWith(TOAST_MESSAGES.adminSignOutSuccess)
    })
  })

  it('handles failed sign out', async () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: { isAuthenticated: true } })
    mockMutateAsync.mockRejectedValue(new Error('logout failed'))

    renderShell('/')

    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('logout failed')
    })
  })
})
