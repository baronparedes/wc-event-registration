import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockNavigate,
  mockUseParams,
  mockUseAdminEventQuery,
  mockCreateMutateAsync,
  mockUpdateMutateAsync,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(),
  mockUseAdminEventQuery: vi.fn(),
  mockCreateMutateAsync: vi.fn(),
  mockUpdateMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

vi.mock('@/hooks/domain/events', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/events')>('@/hooks/domain/events')

  return {
    ...actual,
    useAdminEventQuery: (...args: unknown[]) => mockUseAdminEventQuery(...args),
    useCreateEventMutation: () => ({
      mutateAsync: mockCreateMutateAsync,
      isPending: false,
    }),
    useUpdateEventMutation: () => ({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    }),
  }
})

import { AdminEventFormPage } from '@/pages/admin/events/_event-form'

describe('AdminEventFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ id: 'event-1' })
    mockUseAdminEventQuery.mockReturnValue({
      data: {
        id: 'event-1',
        title: 'Original Event',
        slug: 'original-event',
        description: 'Existing description',
        location: 'Main Hall',
        starts_at: '2026-07-01T10:00:00.000Z',
        ends_at: '2026-07-01T12:00:00.000Z',
        registration_opens_at: '2026-06-01T10:00:00.000Z',
        registration_closes_at: '2026-06-30T10:00:00.000Z',
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'open',
      },
      isLoading: false,
    })
    mockUpdateMutateAsync.mockResolvedValue(undefined)
  })

  it('keeps Save Changes disabled until the edit form becomes dirty, then submits', async () => {
    render(<AdminEventFormPage mode="edit" />)

    const saveButton = await screen.findByRole('button', { name: 'Save Changes' })
    expect(saveButton.hasAttribute('disabled')).toBe(true)

    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { value: 'Updated Event Title' },
    })

    await waitFor(() => {
      expect(saveButton.hasAttribute('disabled')).toBe(false)
    })

    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: 'event-1',
        title: 'Updated Event Title',
        slug: 'original-event',
        description: 'Existing description',
        location: 'Main Hall',
        starts_at: '2026-07-01T10:00',
        ends_at: '2026-07-01T12:00',
        registration_opens_at: '2026-06-01T10:00',
        registration_closes_at: '2026-06-30T10:00',
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'open',
      })
    })

    expect(mockToastSuccess).toHaveBeenCalledWith('Event updated successfully.')
    expect(mockNavigate).toHaveBeenCalledWith('/admin/events')
  })
})
