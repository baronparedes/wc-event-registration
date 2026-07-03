import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { faker } from '@faker-js/faker'

const {
  mockUseParams,
  mockNavigate,
  mockUseAdminEventQuery,
  mockUseAdminPublicRegistrationsQuery,
  mockGetCurrentPageFromCursor,
  mockGetPageCursor,
} = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockNavigate: vi.fn(),
  mockUseAdminEventQuery: vi.fn(),
  mockUseAdminPublicRegistrationsQuery: vi.fn(),
  mockGetCurrentPageFromCursor: vi.fn(),
  mockGetPageCursor: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/hooks/domain/events', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/events')>('@/hooks/domain/events')
  return {
    ...actual,
    useAdminEventQuery: (...args: unknown[]) => mockUseAdminEventQuery(...args),
  }
})

vi.mock('@/hooks/domain/public-registrations', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/public-registrations')>(
    '@/hooks/domain/public-registrations',
  )
  return {
    ...actual,
    useAdminPublicRegistrationsQuery: (...args: unknown[]) =>
      mockUseAdminPublicRegistrationsQuery(...args),
  }
})

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')
  return {
    ...actual,
    getCurrentPageFromCursor: (...args: unknown[]) => mockGetCurrentPageFromCursor(...args),
    getPageCursor: (...args: unknown[]) => mockGetPageCursor(...args),
  }
})

vi.mock('@/components/ui/AdminPaginationControls', () => ({
  AdminPaginationControls: () => <div>Pagination</div>,
}))

vi.mock('@/pages/admin/events/[id]/registrations/components', () => ({
  PublicRegistrationsList: (props: { registrations: Array<{ email: string }> }) => (
    <div>{`Public registrations: ${props.registrations.map((registration) => registration.email).join(', ')}`}</div>
  ),
}))

import { AdminPublicRegistrationsPage } from '@/pages/admin/events/[id]/public-registrations'

describe('AdminPublicRegistrationsPage', () => {
  let testEventId: string

  beforeEach(() => {
    vi.clearAllMocks()
    testEventId = faker.string.uuid()
    mockUseParams.mockReturnValue({ id: testEventId })
    mockGetCurrentPageFromCursor.mockReturnValue(1)
    mockGetPageCursor.mockReturnValue(null)
  })

  function renderWithRouter() {
    return render(
      <MemoryRouter>
        <AdminPublicRegistrationsPage />
      </MemoryRouter>,
    )
  }

  it('renders registrations and published-state banner', () => {
    const eventTitle = faker.lorem.words(2)
    const attendeeEmail = faker.internet.email()

    mockUseAdminEventQuery.mockReturnValue({
      data: { id: testEventId, title: eventTitle, status: 'published' },
      isLoading: false,
      error: null,
    })
    mockUseAdminPublicRegistrationsQuery.mockReturnValue({
      data: {
        items: [{ email: attendeeEmail }],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    })

    renderWithRouter()

    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/admin/events')
    expect(screen.getByRole('link', { name: eventTitle })).toHaveAttribute(
      'href',
      `/admin/events/${testEventId}`,
    )
    expect(screen.getByRole('link', { name: 'Back to Event' })).toHaveAttribute(
      'href',
      `/admin/events/${testEventId}`,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Public Registrations' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('This event is published. All public registrations are visible.'),
    ).toBeInTheDocument()
    expect(screen.getByText(`Public registrations: ${attendeeEmail}`)).toBeInTheDocument()
  })

  it('renders error state when queries fail', () => {
    const errorMessage = faker.lorem.words(2)

    mockUseAdminEventQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error(errorMessage),
    })
    mockUseAdminPublicRegistrationsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })

    renderWithRouter()

    expect(screen.getByText('Public Registrations')).toBeInTheDocument()
    expect(screen.getByText(/Error loading public registrations:/)).toBeInTheDocument()
  })

  it('renders invalid event id state', () => {
    mockUseParams.mockReturnValue({})
    mockUseAdminEventQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })
    mockUseAdminPublicRegistrationsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })

    renderWithRouter()

    expect(screen.getByText('Invalid event ID')).toBeInTheDocument()
  })

  it('renders mobile-stacked header actions and navigates to member registrations', () => {
    const eventTitle = faker.lorem.words(2)

    mockUseAdminEventQuery.mockReturnValue({
      data: { id: testEventId, title: eventTitle, status: 'published' },
      isLoading: false,
      error: null,
    })
    mockUseAdminPublicRegistrationsQuery.mockReturnValue({
      data: {
        items: [],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    })

    renderWithRouter()

    const memberRegistrationsButton = screen.getByRole('button', {
      name: 'View Member Registrations',
    })
    const headerActionsContainer = memberRegistrationsButton.parentElement

    expect(headerActionsContainer).toHaveClass('w-full')
    expect(headerActionsContainer).toHaveClass('flex-col')
    expect(headerActionsContainer).toHaveClass('items-stretch')

    fireEvent.click(memberRegistrationsButton)
    expect(mockNavigate).toHaveBeenCalledWith(`/admin/events/${testEventId}/registrations`)
  })

  it('enables clear button after debounced search and clears input', () => {
    vi.useFakeTimers()
    const eventTitle = faker.lorem.words(2)
    const searchTerm = faker.person.firstName()

    mockUseAdminEventQuery.mockReturnValue({
      data: { id: testEventId, title: eventTitle, status: 'published' },
      isLoading: false,
      error: null,
    })
    mockUseAdminPublicRegistrationsQuery.mockReturnValue({
      data: {
        items: [],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    })

    renderWithRouter()

    const clearButton = screen.getByRole('button', { name: 'Clear' })
    expect(clearButton).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText(/Search by name or email/i), {
      target: { value: searchTerm },
    })

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(clearButton).toBeEnabled()
    fireEvent.click(clearButton)
    expect(
      (screen.getByPlaceholderText(/Search by name or email/i) as HTMLInputElement).value,
    ).toBe('')

    vi.useRealTimers()
  })
})
