import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EventFormActions } from '@/pages/admin/events/_event-form/components/EventFormActions'

describe('EventFormActions', () => {
  it('renders disabled mode with Back to Events only', () => {
    const onCancel = vi.fn()

    render(<EventFormActions disabled isEditMode isPending={false} onCancel={onCancel} />)

    const backButton = screen.getByRole('button', { name: 'Back to Events' })
    expect(backButton).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument()

    fireEvent.click(backButton)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders create mode with Create Event submit label', () => {
    const onCancel = vi.fn()

    render(<EventFormActions isEditMode={false} isPending={false} onCancel={onCancel} />)

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Event' })).toBeEnabled()
  })

  it('renders edit mode with Save Changes label', () => {
    render(<EventFormActions isEditMode isPending={false} onCancel={() => undefined} />)

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()
  })

  it('shows Saving state and disables actions while pending', () => {
    render(<EventFormActions isEditMode isPending onCancel={() => undefined} />)

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
  })

  it('disables submit when hasChanges is false', () => {
    render(
      <EventFormActions
        hasChanges={false}
        isEditMode
        isPending={false}
        onCancel={() => undefined}
      />,
    )

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
  })
})
