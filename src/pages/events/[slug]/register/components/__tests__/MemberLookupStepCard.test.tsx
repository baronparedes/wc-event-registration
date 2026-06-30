import { useForm } from 'react-hook-form'
import { BrowserRouter } from 'react-router-dom'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemberLookupStepCard } from '../MemberLookupStepCard'

function Harness(props: {
  slug?: string
  initialMemberId?: string
  isLookupPending?: boolean
  lookupErrorMessage?: string | null
  suppressLookupWarning?: boolean
  shouldHighlightInput?: boolean
  onLookupSubmit: (values: { memberId?: string; name?: string }) => void
  onDismissLookupError?: () => void
  allowNameLookup?: boolean
  allowPublicRegistration?: boolean
}) {
  const form = useForm<{ memberId?: string; name?: string }>({
    defaultValues: {
      memberId: props.initialMemberId ?? '',
      name: '',
    },
  })

  return (
    <BrowserRouter>
      <MemberLookupStepCard
        slug={props.slug ?? 'test-event'}
        lookupForm={form}
        onLookupSubmit={props.onLookupSubmit}
        isLookupPending={props.isLookupPending ?? false}
        lookupErrorMessage={props.lookupErrorMessage ?? null}
        suppressLookupWarning={props.suppressLookupWarning}
        memberIdInputRef={{ current: null }}
        shouldHighlightInput={props.shouldHighlightInput}
        onDismissLookupError={props.onDismissLookupError}
        allowNameLookup={props.allowNameLookup ?? true}
        allowPublicRegistration={props.allowPublicRegistration}
      />
    </BrowserRouter>
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

    // Select the Member ID method
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Scan.*RFID/i }))
    })

    await act(async () => {
      fireEvent.input(screen.getByLabelText(/Scan RFID or Member ID/i), {
        target: { value: 'WC-001' },
      })
    })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: 'Continue' }).closest('form')!)
    })

    await waitFor(() => {
      expect(onLookupSubmit).toHaveBeenCalled()
    })

    expect(onLookupSubmit.mock.calls[0]?.[0]).toEqual({ memberId: 'WC-001', name: '' })
  })

  it('renders the pending state as disabled', () => {
    const onLookupSubmit = vi.fn()

    render(<Harness onLookupSubmit={onLookupSubmit} isLookupPending />)

    // When pending, the method selection buttons should be disabled
    expect(screen.getByRole('button', { name: /Scan.*RFID/i })).toBeDisabled()
    if (screen.queryByRole('button', { name: /Search by my name/i })) {
      expect(screen.getByRole('button', { name: /Search by my name/i })).toBeDisabled()
    }
  })

  it('shows and dismisses the lookup error panel', () => {
    const onLookupSubmit = vi.fn()
    const onDismissLookupError = vi.fn()

    render(
      <Harness
        onLookupSubmit={onLookupSubmit}
        lookupErrorMessage="We could not verify that entry. Please contact your administrator for support."
        shouldHighlightInput
        onDismissLookupError={onDismissLookupError}
      />,
    )

    // First select the method
    fireEvent.click(screen.getByRole('button', { name: /Scan.*RFID/i }))

    expect(screen.getByText('Please check your entry')).toBeInTheDocument()
    expect(
      screen.getByText(
        'We could not verify that entry. Please contact your administrator for support.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Dismiss member lookup warning')).toBeInTheDocument()
    expect(screen.getByLabelText(/Scan RFID or Member ID/i)).toHaveClass('ring-2')

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

    // First select the method
    fireEvent.click(screen.getByRole('button', { name: /Scan.*RFID/i }))

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText(/Scan RFID or Member ID/i)).toBeInTheDocument()
  })
})
