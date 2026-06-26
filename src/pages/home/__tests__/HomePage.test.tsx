import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUsePublicEventListingQuery, mockEventSection } = vi.hoisted(() => ({
  mockUsePublicEventListingQuery: vi.fn(),
  mockEventSection: vi.fn(),
}))

vi.mock('@/hooks/domain/events', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/events')>('@/hooks/domain/events')
  return {
    ...actual,
    usePublicEventListingQuery: () => mockUsePublicEventListingQuery(),
  }
})

vi.mock('@/pages/home/components', () => ({
  EventSection: (props: { title: string; events: Array<{ id: string }> }) => {
    mockEventSection(props)
    return <div>{`${props.title}: ${props.events.length}`}</div>
  },
}))

import { HomePage } from '@/pages/home'

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('splits events into open, upcoming, and past sections', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [
        { id: '1', listingStatus: 'open' },
        { id: '2', listingStatus: 'upcoming' },
        { id: '3', listingStatus: 'past' },
      ],
      isLoading: false,
      isError: false,
    })

    render(<HomePage />)

    expect(screen.getByText('Open for Registration: 1')).toBeInTheDocument()
    expect(screen.getByText('Upcoming: 1')).toBeInTheDocument()
    expect(screen.getByText('Past 3 Months: 1')).toBeInTheDocument()
  })

  it('renders empty-state text when no events are available', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })

    render(<HomePage />)

    expect(
      screen.getByText('No open, upcoming, or recent past events at this time.'),
    ).toBeInTheDocument()
  })
})
