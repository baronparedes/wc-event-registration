import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseParams, mockUseAdminEventQuery, mockUseAdminRegistrationsQuery } = vi.hoisted(
  () => ({
    mockUseParams: vi.fn(),
    mockUseAdminEventQuery: vi.fn(),
    mockUseAdminRegistrationsQuery: vi.fn(),
  }),
)

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => mockUseParams(),
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
    getCurrentPageFromCursor: vi.fn(() => 1),
    getPageCursor: vi.fn(() => null),
  }
})

vi.mock('@/pages/admin/events/[id]/registrations/components', () => ({
  RegistrationsList: (props: { registrations: Array<{ member_id: string }> }) => (
    <div>{`Registrations: ${props.registrations.map((registration) => registration.member_id).join(', ')}`}</div>
  ),
  ExportButton: () => <div>Export Button</div>,
}))

import { AdminRegistrationsPage } from '@/pages/admin/events/[id]/registrations'

describe('AdminRegistrationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ id: 'event-1' })
  })

  it('renders registrations and published-state banner', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: { id: 'event-1', title: 'Sample Event', status: 'published' },
      isLoading: false,
      error: null,
    })
    mockUseAdminRegistrationsQuery.mockReturnValue({
      data: {
        items: [{ member_id: 'WC-001' }],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    })

    render(<AdminRegistrationsPage />)

    expect(screen.getByText('Registrations for Sample Event')).toBeInTheDocument()
    expect(
      screen.getByText('This event is published. All registrations are visible.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Registrations: WC-001')).toBeInTheDocument()
  })

  it('renders error state when queries fail', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('boom'),
    })
    mockUseAdminRegistrationsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })

    render(<AdminRegistrationsPage />)

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText(/Error loading registrations:/)).toBeInTheDocument()
  })
})
