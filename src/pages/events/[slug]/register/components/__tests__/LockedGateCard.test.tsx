import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LockedGateCard } from '../LockedGateCard'

describe('LockedGateCard', () => {
  it('renders the locked registration message', () => {
    render(<LockedGateCard />)

    expect(screen.getByText('Registration Is Not Open Yet')).toBeInTheDocument()
    expect(
      screen.getByText(
        'This event is not accepting registrations right now. Please check back later.',
      ),
    ).toBeInTheDocument()
  })
})
