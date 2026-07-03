import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { faker } from '@faker-js/faker'

const {
  mockUseParams,
  mockNavigate,
  mockUseAdminEventQuery,
  mockUseAdminRegistrationsQuery,
  mockGetCurrentPageFromCursor,
  mockGetPageCursor,
  mockPaginationProps,
} = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockNavigate: vi.fn(),
  mockUseAdminEventQuery: vi.fn(),
  mockUseAdminRegistrationsQuery: vi.fn(),
  mockGetCurrentPageFromCursor: vi.fn(),
  mockGetPageCursor: vi.fn(),
  mockPaginationProps: vi.fn(),
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

vi.mock('@/hooks/domain/registrations', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/registrations')>(
    '@/hooks/domain/registrations',
  )
  return {
    ...actual,
    useAdminRegistrationsQuery: (...args: unknown[]) => mockUseAdminRegistrationsQuery(...args),
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
  AdminPaginationControls: (props: {
    onFirstPage: () => void
    onPreviousPage: () => void
    onNextPage: () => void
    onLastPage: () => void
    onGoToPage: (page: number) => void
    onPageSizeChange: (size: number) => void
  }) => {
    mockPaginationProps(props)
    return (
      <div>
        <button onClick={props.onFirstPage} type="button">
          First
        </button>
        <button onClick={props.onPreviousPage} type="button">
          Previous
        </button>
        <button onClick={props.onNextPage} type="button">
          Next
        </button>
        <button onClick={props.onLastPage} type="button">
          Last
        </button>
        <button onClick={() => props.onGoToPage(2)} type="button">
          Go Page 2
        </button>
        <button onClick={() => props.onPageSizeChange(50)} type="button">
          Page Size 50
        </button>
      </div>
    )
  },
}))

vi.mock('@/pages/admin/events/[id]/registrations/components', () => ({
  RegistrationsList: (props: { registrations: Array<{ member_id: string }> }) => (
    <div>{`Registrations: ${props.registrations.map((registration) => registration.member_id).join(', ')}`}</div>
  ),
  CopyNamesButton: () => <div>Copy Names Button</div>,
  ExportButton: () => <div>Export Button</div>,
}))

import { AdminRegistrationsPage } from '@/pages/admin/events/[id]/registrations'

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <AdminRegistrationsPage />
    </MemoryRouter>,
  )
}

describe('AdminRegistrationsPage', () => {
  let testEventId: string

  beforeEach(() => {
    vi.clearAllMocks()
    testEventId = faker.string.uuid()
    mockUseParams.mockReturnValue({ id: testEventId })
    mockNavigate.mockReset()
    mockGetCurrentPageFromCursor.mockReturnValue(1)
    mockGetPageCursor.mockReturnValue(null)
  })

  it('renders registrations and published-state banner', () => {
    const eventTitle = faker.lorem.words(2)
    const memberId = faker.helpers.slugify(faker.lorem.words(2)).toUpperCase()

    mockUseAdminEventQuery.mockReturnValue({
      data: { id: testEventId, title: eventTitle, status: 'published' },
      isLoading: false,
      error: null,
    })
    mockUseAdminRegistrationsQuery.mockReturnValue({
      data: {
        items: [{ member_id: memberId }],
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
    expect(screen.getByRole('heading', { level: 1, name: 'Registrations' })).toBeInTheDocument()
    expect(
      screen.getByText('This event is published. All registrations are visible.'),
    ).toBeInTheDocument()
    expect(screen.getByText(`Registrations: ${memberId}`)).toBeInTheDocument()
  })

  it('renders error state when queries fail', () => {
    const errorMessage = faker.lorem.words(2)

    mockUseAdminEventQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error(errorMessage),
    })
    mockUseAdminRegistrationsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })

    renderWithRouter()

    expect(screen.getByText('Event Registrations')).toBeInTheDocument()
    expect(screen.getByText(/Error loading registrations:/)).toBeInTheDocument()
  })

  it('renders invalid event id state', () => {
    mockUseParams.mockReturnValue({})
    mockUseAdminEventQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })
    mockUseAdminRegistrationsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })

    renderWithRouter()

    expect(screen.getByText('Invalid event ID')).toBeInTheDocument()
  })

  it('renders archived-state banner', () => {
    const eventTitle = faker.lorem.words(2)
    const memberId = faker.helpers.slugify(faker.lorem.words(2)).toUpperCase()

    mockUseAdminEventQuery.mockReturnValue({
      data: { id: testEventId, title: eventTitle, status: 'archived' },
      isLoading: false,
      error: null,
    })
    mockUseAdminRegistrationsQuery.mockReturnValue({
      data: {
        items: [{ member_id: memberId }],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    })

    renderWithRouter()

    expect(
      screen.getByText('This event is archived. Registrations cannot be cancelled.'),
    ).toBeInTheDocument()
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
    mockUseAdminRegistrationsQuery.mockReturnValue({
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

    fireEvent.change(screen.getByPlaceholderText(/Search by name/i), {
      target: { value: searchTerm },
    })

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(clearButton).toBeEnabled()
    fireEvent.click(clearButton)
    expect((screen.getByPlaceholderText(/Search by name/i) as HTMLInputElement).value).toBe('')

    vi.useRealTimers()
  })

  it('wires pagination actions to cursor helper functions', () => {
    const eventTitle = faker.lorem.words(2)
    const memberId = faker.helpers.slugify(faker.lorem.words(2)).toUpperCase()

    mockGetCurrentPageFromCursor.mockReturnValue(2)
    mockGetPageCursor.mockImplementation((page: number) => `cursor-${page}`)
    mockUseAdminEventQuery.mockReturnValue({
      data: { id: testEventId, title: eventTitle, status: 'published' },
      isLoading: false,
      error: null,
    })
    mockUseAdminRegistrationsQuery.mockReturnValue({
      data: {
        items: [{ member_id: memberId }],
        hasMore: true,
        nextCursor: 'cursor-next',
        totalPages: 4,
      },
      isLoading: false,
      error: null,
    })

    renderWithRouter()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    fireEvent.click(screen.getByRole('button', { name: 'First' }))
    fireEvent.click(screen.getByRole('button', { name: 'Last' }))
    fireEvent.click(screen.getByRole('button', { name: 'Go Page 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Page Size 50' }))

    expect(mockGetPageCursor).toHaveBeenCalledWith(1, expect.any(Number))
    expect(mockGetPageCursor).toHaveBeenCalledWith(4, expect.any(Number))
    expect(mockGetPageCursor).toHaveBeenCalledWith(2, expect.any(Number))
  })

  it('renders mobile-stacked header action group and navigates to public registrations', () => {
    const eventTitle = faker.lorem.words(2)

    mockUseAdminEventQuery.mockReturnValue({
      data: { id: testEventId, title: eventTitle, status: 'published' },
      isLoading: false,
      error: null,
    })
    mockUseAdminRegistrationsQuery.mockReturnValue({
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

    const publicRegistrationsButton = screen.getByRole('button', {
      name: 'View Public Registrations',
    })
    const headerActionsContainer = publicRegistrationsButton.parentElement

    expect(headerActionsContainer).toHaveClass('w-full')
    expect(headerActionsContainer).toHaveClass('flex-col')
    expect(headerActionsContainer).toHaveClass('items-stretch')

    fireEvent.click(publicRegistrationsButton)
    expect(mockNavigate).toHaveBeenCalledWith(`/admin/events/${testEventId}/public-registrations`)
  })
})
