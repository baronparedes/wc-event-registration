import { useForm } from 'react-hook-form'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemberLookupStepCard } from '../MemberLookupStepCard'

function Harness(props: {
  initialMemberId?: string
  isLookupPending?: boolean
  lookupErrorMessage?: string | null
  shouldFadeLookupError?: boolean
  suppressLookupWarning?: boolean
  shouldHighlightInput?: boolean
  onLookupSubmit: (values: { memberId: string }) => void
  onDismissLookupError?: () => void
}) {
  const form = useForm<{ memberId: string }>({
    defaultValues: {
      memberId: props.initialMemberId ?? '',
    },
  })

  return (
    <MemberLookupStepCard
      lookupForm={form}
      onLookupSubmit={props.onLookupSubmit}
      isLookupPending={props.isLookupPending ?? false}
      lookupErrorMessage={props.lookupErrorMessage ?? null}
      shouldFadeLookupError={props.shouldFadeLookupError}
      suppressLookupWarning={props.suppressLookupWarning}
      memberIdInputRef={{ current: null }}
      shouldHighlightInput={props.shouldHighlightInput}
      onDismissLookupError={props.onDismissLookupError}
    />
  )
}

describe('MemberLookupStepCard', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('submits the member id when the form is active', async () => {
    const onLookupSubmit = vi.fn()

    render(<Harness onLookupSubmit={onLookupSubmit} />)

    await act(async () => {
      fireEvent.input(screen.getByLabelText('Member ID'), {
        target: { value: 'WC-001' },
      })
    })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: 'Continue' }).closest('form')!)
    })

    await waitFor(() => {
      expect(onLookupSubmit).toHaveBeenCalled()
    })

    expect(onLookupSubmit.mock.calls[0]?.[0]).toEqual({ memberId: 'WC-001' })
  })

  it('renders the pending state as disabled', () => {
    const onLookupSubmit = vi.fn()

    render(<Harness onLookupSubmit={onLookupSubmit} isLookupPending />)

    expect(screen.getByLabelText('Member ID')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled()
  })

  it('shows and dismisses the lookup error panel', () => {
    const onLookupSubmit = vi.fn()
    const onDismissLookupError = vi.fn()

    render(
      <Harness
        onLookupSubmit={onLookupSubmit}
        lookupErrorMessage="We could not verify that Member ID."
        shouldFadeLookupError
        shouldHighlightInput
        onDismissLookupError={onDismissLookupError}
      />,
    )

    expect(screen.getByText('Please check your Member ID')).toBeInTheDocument()
    expect(screen.getByText('We could not verify that Member ID.')).toBeInTheDocument()
    expect(screen.getByLabelText('Dismiss member lookup warning')).toBeInTheDocument()
    expect(screen.getByLabelText('Member ID')).toHaveClass('ring-2')

    fireEvent.click(screen.getByLabelText('Dismiss member lookup warning'))

    expect(onDismissLookupError).toHaveBeenCalledTimes(1)
  })

  it('suppresses the warning panel when requested', () => {
    const onLookupSubmit = vi.fn()

    render(
      <Harness
        onLookupSubmit={onLookupSubmit}
        lookupErrorMessage="We could not verify that Member ID."
        suppressLookupWarning
      />,
    )

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Member ID')).toBeInTheDocument()
  })
})
