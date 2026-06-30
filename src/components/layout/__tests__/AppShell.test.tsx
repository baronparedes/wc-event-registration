import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AppShell } from '../AppShell'

const queryClient = new QueryClient()

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>,
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders header with title and date', () => {
    renderWithProviders(<AppShell />)
    expect(screen.getByText('WC Event Registrations')).toBeInTheDocument()
    const dateString = new Date().toDateString()
    expect(screen.getByText(dateString)).toBeInTheDocument()
  })

  it('renders desktop navigation with Events link', () => {
    renderWithProviders(<AppShell />)
    const eventsLink = screen.getByRole('link', { name: 'Events' })
    expect(eventsLink).toBeInTheDocument()
  })

  it('renders Admin dropdown button', () => {
    renderWithProviders(<AppShell />)
    const adminButton = screen.getByRole('button', { name: 'Admin' })
    expect(adminButton).toBeInTheDocument()
  })

  it('does not render hamburger menu button', () => {
    renderWithProviders(<AppShell />)
    const menuButton = screen.queryByRole('button', { name: /toggle menu/i })
    expect(menuButton).not.toBeInTheDocument()
  })

  it('renders brand logo image', () => {
    renderWithProviders(<AppShell />)
    const logo = screen.getByAltText('WC Events')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('src', expect.stringContaining('wc-events-brand.png'))
  })

  it('renders Outlet for page content', () => {
    renderWithProviders(<AppShell />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
