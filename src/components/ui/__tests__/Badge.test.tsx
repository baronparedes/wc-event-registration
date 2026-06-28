import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from '@/components/ui/Badge'

describe('Badge', () => {
  it('uses open variant by default', () => {
    render(<Badge>Open</Badge>)

    expect(screen.getByText('Open')).toHaveClass('bg-primary')
    expect(screen.getByText('Open')).toHaveClass('text-white')
  })

  it('renders each variant class', () => {
    const { rerender } = render(<Badge variant="upcoming">Upcoming</Badge>)
    expect(screen.getByText('Upcoming')).toHaveClass('bg-secondary')

    rerender(<Badge variant="closed">Closed</Badge>)
    expect(screen.getByText('Closed')).toHaveClass('bg-slate-200')

    rerender(<Badge variant="error">Error</Badge>)
    expect(screen.getByText('Error')).toHaveClass('bg-red-100')
  })

  it('renders icon slot and custom class names', () => {
    render(
      <Badge className="my-badge" icon={<span data-testid="icon">i</span>}>
        Label
      </Badge>,
    )

    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Label')).toHaveClass('my-badge')
  })
})
