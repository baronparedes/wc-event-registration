import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseParams, mockUseAdminEventQuery, mockUseAdminEventFieldsQuery } = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockUseAdminEventQuery: vi.fn(),
  mockUseAdminEventFieldsQuery: vi.fn(),
}))

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

vi.mock('@/hooks/domain/event-fields', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/event-fields')>(
    '@/hooks/domain/event-fields',
  )
  return {
    ...actual,
    useAdminEventFieldsQuery: (...args: unknown[]) => mockUseAdminEventFieldsQuery(...args),
  }
})

vi.mock('@/pages/admin/events/[id]/fields/components', () => ({
  EventFieldsList: (props: {
    fields: Array<{ id: string; label: string }>
    onEdit: (field: { id: string; label: string }) => void
  }) => (
    <div>
      <div>{`Fields List: ${props.fields.map((field) => field.label).join(', ')}`}</div>
      {props.fields[0] && (
        <button type="button" onClick={() => props.onEdit(props.fields[0])}>
          Edit First
        </button>
      )}
    </div>
  ),
  EventFieldEditPanel: (props: { field: { label: string } | null; onClose: () => void }) => (
    <div>
      <div>{props.field ? `Edit Panel: ${props.field.label}` : 'Create Panel'}</div>
      <button type="button" onClick={props.onClose}>
        Close Panel
      </button>
    </div>
  ),
}))

import { AdminEventFieldsPage } from '@/pages/admin/events/[id]/fields'

describe('AdminEventFieldsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ id: 'event-1' })
  })

  it('renders event fields list for a draft event and opens create panel', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: { id: 'event-1', title: 'Sample Event', status: 'draft' },
      isLoading: false,
    })
    mockUseAdminEventFieldsQuery.mockReturnValue({
      data: [{ id: 'field-1', label: 'Team Name' }],
      isLoading: false,
    })

    render(
      <MemoryRouter>
        <AdminEventFieldsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Fields List: Team Name')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add Field' }))
    expect(screen.getByText('Create Panel')).toBeInTheDocument()
  })

  it('shows published banner and disables adding fields', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: { id: 'event-1', title: 'Sample Event', status: 'published' },
      isLoading: false,
    })
    mockUseAdminEventFieldsQuery.mockReturnValue({ data: [], isLoading: false })

    render(
      <MemoryRouter>
        <AdminEventFieldsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Published event')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Field' })).toBeDisabled()
  })

  it('shows loading state while event or fields are loading', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    mockUseAdminEventFieldsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    })

    render(
      <MemoryRouter>
        <AdminEventFieldsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading fields...')).toBeInTheDocument()
  })

  it('shows not-found state when event query returns null', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: null,
      isLoading: false,
    })
    mockUseAdminEventFieldsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    })

    render(
      <MemoryRouter>
        <AdminEventFieldsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Event not found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to events' })).toBeInTheDocument()
  })

  it('shows archived banner and supports edit panel open/close', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: { id: 'event-1', title: 'Sample Event', status: 'archived' },
      isLoading: false,
    })
    mockUseAdminEventFieldsQuery.mockReturnValue({
      data: [{ id: 'field-1', label: 'Team Name' }],
      isLoading: false,
    })

    render(
      <MemoryRouter>
        <AdminEventFieldsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Archived event')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Field' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Edit First' }))
    expect(screen.getByText('Edit Panel: Team Name')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close Panel' }))
    expect(screen.queryByText('Edit Panel: Team Name')).not.toBeInTheDocument()
  })
})
