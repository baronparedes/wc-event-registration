import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AppMobileShell } from '../AppMobileShell'

const queryClient = new QueryClient()

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>,
  )
}

describe('AppMobileShell', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders header with title and date', () => {
    renderWithProviders(<AppMobileShell />)
    expect(screen.getByText('WC Event Registrations')).toBeInTheDocument()
    const dateString = new Date().toDateString()
    expect(screen.getByText(dateString)).toBeInTheDocument()
  })

  it('renders hamburger menu button', () => {
    renderWithProviders(<AppMobileShell />)
    const menuButton = screen.getByRole('button', { name: /toggle menu/i })
    expect(menuButton).toBeInTheDocument()
  })

  it('opens mobile menu when hamburger is clicked', () => {
    renderWithProviders(<AppMobileShell />)

    const menuButton = screen.getByRole('button', { name: /toggle menu/i })
    fireEvent.click(menuButton)

    expect(screen.getByText('Events')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('closes mobile menu when hamburger is clicked again', () => {
    renderWithProviders(<AppMobileShell />)

    const menuButton = screen.getByRole('button', { name: /toggle menu/i })
    fireEvent.click(menuButton)
    expect(screen.getByText('Events')).toBeInTheDocument()

    fireEvent.click(menuButton)
    // After closing, the menu items should not be in the document
    const eventButtons = screen.queryAllByText('Events')
    expect(eventButtons.length).toBe(0)
  })

  it('displays admin dropdown when Admin is clicked', () => {
    renderWithProviders(<AppMobileShell />)

    const menuButton = screen.getByRole('button', { name: /toggle menu/i })
    fireEvent.click(menuButton)

    const adminButton = screen.getByRole('button', { name: 'Admin' })
    fireEvent.click(adminButton)

    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('renders Outlet for page content', () => {
    renderWithProviders(<AppMobileShell />)
    // The Outlet should be rendered (contains the page)
    // We can't directly test Outlet, but we can verify the structure exists
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
