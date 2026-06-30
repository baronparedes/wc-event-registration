import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProfileStepCard } from '../ProfileStepCard'

const matchedMember = {
  user_id: 'user-1',
  member_id: 'WC-001',
  full_name: 'Jane Doe',
  nickname: 'Janie',
  first_name: 'Jane',
  last_name: 'Doe',
}

describe('ProfileStepCard', () => {
  it('shows the placeholder before lookup and when details are fading', () => {
    render(<ProfileStepCard matchedMember={null} />)

    expect(screen.getByText('Your details will appear here after Step 1.')).toBeInTheDocument()
  })

  it('renders the update state and scrolls into view when registration is blocked', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true })
    const scrollIntoView = vi.fn()

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      writable: true,
      value: scrollIntoView,
    })

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMedia,
    })

    render(<ProfileStepCard matchedMember={matchedMember} isUpdateMode isRegistrationBlocked />)

    const status = screen.getByText(
      'You are already registered. No further actions are needed at the moment.',
    )
    expect(status).toBeInTheDocument()
    expect(
      screen.getByText('Your registration is already complete for this event.'),
    ).toBeInTheDocument()
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' })
  })

  it('shows the fading placeholder when details are hidden', () => {
    render(<ProfileStepCard matchedMember={matchedMember} shouldFadeDetails />)

    expect(screen.getByText('Your details will appear here after Step 1.')).toBeInTheDocument()
  })

  it('shows the regular verified state', () => {
    render(<ProfileStepCard matchedMember={matchedMember} />)

    expect(screen.getByText('Review your details below.')).toBeInTheDocument()
    expect(screen.getByText('Tap "Yes, I confirm" to continue to Step 3.')).toBeInTheDocument()
  })
})
