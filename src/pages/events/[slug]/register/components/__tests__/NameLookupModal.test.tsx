import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NameLookupModal } from '../NameLookupModal'

describe('NameLookupModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders trigger button inline', () => {
    const onSubmit = vi.fn()

    render(<NameLookupModal onSubmit={onSubmit} isLookupPending={false} />)

    expect(screen.getByText("Don't have your ID? Search by your full name →")).toBeInTheDocument()
  })

  it('renders card variant trigger and pending label', () => {
    const onSubmit = vi.fn()

    const { rerender } = render(
      <NameLookupModal onSubmit={onSubmit} isLookupPending={false} variant="card" />,
    )

    expect(screen.getByRole('button', { name: 'Search by name' })).toBeInTheDocument()

    rerender(<NameLookupModal onSubmit={onSubmit} isLookupPending={true} variant="card" />)
    expect(screen.getByRole('button', { name: 'Searching...' })).toBeDisabled()
  })

  it('opens immediately when autoOpen is true', () => {
    const onSubmit = vi.fn()

    render(<NameLookupModal onSubmit={onSubmit} isLookupPending={false} autoOpen={true} />)

    expect(screen.getByText('Find Your Profile')).toBeInTheDocument()
  })

  it('opens modal when trigger button is clicked', async () => {
    const onSubmit = vi.fn()

    render(<NameLookupModal onSubmit={onSubmit} isLookupPending={false} />)

    const triggerButton = screen.getByText("Don't have your ID? Search by your full name →")

    await act(async () => {
      fireEvent.click(triggerButton)
    })

    expect(screen.getByText('Find Your Profile')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Name')).toBeInTheDocument()
  })

  it('submits form with name and closes modal on success', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<NameLookupModal onSubmit={onSubmit} isLookupPending={false} />)

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByText("Don't have your ID? Search by your full name →"))
    })

    // Fill and submit form
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Your Name'), {
        target: { value: 'John Doe' },
      })
    })

    const submitButton = screen.getByRole('button', { name: 'Search' })

    await act(async () => {
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('John Doe')
    })

    // Modal should close after successful submission
    await waitFor(() => {
      expect(screen.queryByText('Find Your Profile')).not.toBeInTheDocument()
    })
  })

  it('shows error message when submission fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Lookup failed'))

    render(<NameLookupModal onSubmit={onSubmit} isLookupPending={false} />)

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByText("Don't have your ID? Search by your full name →"))
    })

    // Fill and submit form
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Your Name'), {
        target: { value: 'Jane Smith' },
      })
    })

    const submitButton = screen.getByRole('button', { name: 'Search' })

    await act(async () => {
      fireEvent.click(submitButton)
    })

    // Error message should display
    await waitFor(() => {
      expect(screen.getByText('Unable to search by name. Please try again.')).toBeInTheDocument()
    })

    // Modal should stay open
    expect(screen.getByText('Find Your Profile')).toBeInTheDocument()
  })

  it('closes modal when close button is clicked', async () => {
    const onSubmit = vi.fn()

    render(<NameLookupModal onSubmit={onSubmit} isLookupPending={false} />)

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByText("Don't have your ID? Search by your full name →"))
    })

    expect(screen.getByText('Find Your Profile')).toBeInTheDocument()

    // Click on overlay to close (modal closes when clicking outside)
    const overlay = document.querySelector('.fixed.inset-0')

    if (overlay) {
      await act(async () => {
        fireEvent.click(overlay)
      })
    }

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Find Your Profile')).not.toBeInTheDocument()
    })
  })

  it('disables form when submission is loading', async () => {
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => setTimeout(() => resolve(), 100)))

    render(<NameLookupModal onSubmit={onSubmit} isLookupPending={false} />)

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByText("Don't have your ID? Search by your full name →"))
    })

    // Fill form
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Your Name'), {
        target: { value: 'Test User' },
      })
    })

    const submitButton = screen.getByRole('button', { name: 'Search' })
    expect(submitButton).not.toBeDisabled()

    // Submit form (this sets isLoading to true)
    await act(async () => {
      fireEvent.click(submitButton)
    })

    // Button text should change to 'Searching...'
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Searching...' })).toBeInTheDocument()
    })
  })

  it('clears form after successful submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<NameLookupModal onSubmit={onSubmit} isLookupPending={false} />)

    // First submission
    await act(async () => {
      fireEvent.click(screen.getByText("Don't have your ID? Search by your full name →"))
    })

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Your Name'), {
        target: { value: 'Alice Brown' },
      })
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    })

    await waitFor(() => {
      expect(screen.queryByText('Find Your Profile')).not.toBeInTheDocument()
    })

    // Open modal again
    await act(async () => {
      fireEvent.click(screen.getByText("Don't have your ID? Search by your full name →"))
    })

    // Form should be cleared
    const nameInput = screen.getByLabelText('Your Name') as HTMLInputElement
    expect(nameInput.value).toBe('')
  })

  it('validates minimum name length', async () => {
    const onSubmit = vi.fn()

    render(<NameLookupModal onSubmit={onSubmit} isLookupPending={false} />)

    await act(async () => {
      fireEvent.click(screen.getByText("Don't have your ID? Search by your full name →"))
    })

    // Try to submit with empty name
    const submitButton = screen.getByRole('button', { name: 'Search' })

    await act(async () => {
      fireEvent.click(submitButton)
    })

    // Validation error should show
    await waitFor(() => {
      expect(screen.getByText('Please enter your name')).toBeInTheDocument()
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('validates maximum name length', async () => {
    const onSubmit = vi.fn()

    render(<NameLookupModal onSubmit={onSubmit} isLookupPending={false} />)

    await act(async () => {
      fireEvent.click(screen.getByText("Don't have your ID? Search by your full name →"))
    })

    // Try to submit with name exceeding max length (200 chars)
    const longName = 'a'.repeat(201)

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Your Name'), {
        target: { value: longName },
      })
    })

    const submitButton = screen.getByRole('button', { name: 'Search' })

    await act(async () => {
      fireEvent.click(submitButton)
    })

    // Validation error should show (Zod's default max length error)
    await waitFor(() => {
      expect(screen.getByText('Name is too long')).toBeInTheDocument()
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders modal via createPortal outside parent DOM', async () => {
    const onSubmit = vi.fn()

    const { container } = render(
      <div id="test-container">
        <NameLookupModal onSubmit={onSubmit} isLookupPending={false} />
      </div>,
    )

    await act(async () => {
      fireEvent.click(screen.getByText("Don't have your ID? Search by your full name →"))
    })

    // Modal content should not be inside test-container
    const testContainer = container.querySelector('#test-container')
    const modalContent = screen.getByText('Find Your Profile')

    expect(testContainer?.contains(modalContent.closest('form'))).toBe(false)
  })
})
