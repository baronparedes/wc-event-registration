import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

function renderDialog(overrides: Partial<ComponentProps<typeof ConfirmDialog>> = {}) {
  const props: ComponentProps<typeof ConfirmDialog> = {
    isOpen: true,
    title: 'Confirm Action',
    description: 'Body text',
    confirmLabel: 'Confirm',
    confirmLoadingLabel: 'Working...',
    isPending: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }

  render(<ConfirmDialog {...props} />)
  return props
}

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    renderDialog({ isOpen: false })

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument()
  })

  it('calls onCancel when clicking backdrop but not content', () => {
    const props = renderDialog()

    fireEvent.click(screen.getByText('Confirm Action').closest('div') as HTMLDivElement)
    expect(props.onCancel).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Confirm Action').closest('[class*="fixed"]') as Element)
    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows loading label and disables actions while pending', () => {
    const props = renderDialog({ isPending: true })

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Working...' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Working...' }))
    expect(props.onConfirm).not.toHaveBeenCalled()
  })

  it('disables confirm button when explicitly disabled', () => {
    renderDialog({ disabled: true, confirmVariant: 'destructive', cancelLabel: 'Nope' })

    expect(screen.getByRole('button', { name: 'Nope' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
  })
})
