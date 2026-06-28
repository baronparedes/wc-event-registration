import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EventStatusWarning } from '@/pages/admin/events/_event-form/components/EventStatusWarning'

describe('EventStatusWarning', () => {
  it('renders nothing for draft status', () => {
    render(<EventStatusWarning status="draft" />)

    expect(screen.queryByText(/cannot be edited/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/changes will be visible/i)).not.toBeInTheDocument()
  })

  it('renders archived warning', () => {
    render(<EventStatusWarning status="archived" />)

    expect(screen.getByText(/cannot be edited/i)).toBeInTheDocument()
  })

  it('renders published warning', () => {
    render(<EventStatusWarning status="published" />)

    expect(screen.getByText(/changes will be visible to registrants/i)).toBeInTheDocument()
  })

  it('returns null for unexpected status values', () => {
    render(<EventStatusWarning status={'unknown' as never} />)

    expect(screen.queryByText(/cannot be edited/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/changes will be visible/i)).not.toBeInTheDocument()
  })
})
