import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProfileStepFooter } from '../ProfileStepFooter'

describe('ProfileStepFooter', () => {
  it('renders the confirmation button when the user can continue', () => {
    const onContinueToStepThree = vi.fn()

    render(
      <ProfileStepFooter
        canContinueToStepThree
        isRegistrationBlocked={false}
        onContinueToStepThree={onContinueToStepThree}
        stepTimeoutSecondsRemaining={null}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Yes, I confirm' }))

    expect(onContinueToStepThree).toHaveBeenCalledTimes(1)
  })

  it('shows the continue timeout copy when a timer is active', () => {
    render(
      <ProfileStepFooter
        canContinueToStepThree
        isRegistrationBlocked={false}
        onContinueToStepThree={() => undefined}
        stepTimeoutSecondsRemaining={7}
      />,
    )

    expect(screen.getByText('Returning to Step 1 in 7s if no one continues.')).toBeInTheDocument()
  })

  it('shows the blocked timeout copy when registration is blocked', () => {
    render(
      <ProfileStepFooter
        canContinueToStepThree={false}
        isRegistrationBlocked
        stepTimeoutSecondsRemaining={9}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Yes, I confirm' })).toBeNull()
    expect(screen.getByText('Returning to Step 1 in 9s.')).toBeInTheDocument()
  })

  it('renders nothing when no action or timeout is available', () => {
    const { container } = render(
      <ProfileStepFooter
        canContinueToStepThree={false}
        isRegistrationBlocked={false}
        stepTimeoutSecondsRemaining={null}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
