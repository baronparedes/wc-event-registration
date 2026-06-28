import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')

  return {
    ...actual,
    formatDateTime: (value: string | null) => (value ? `formatted:${value}` : 'TBD'),
  }
})

import { EventHeaderCard } from '../EventHeaderCard'

describe('EventHeaderCard', () => {
  it('renders the available event summary and gate window', () => {
    render(
      <EventHeaderCard
        isLoading={false}
        isError={false}
        isGateReady
        eventWindowText={{ opens: 'June 1', closes: 'June 30' }}
        availability={{
          status: 'available',
          event: {
            id: '3bfc2d8f-067f-4f6f-9403-f420f819eca7',
            slug: 'summer-sprint',
            title: 'Summer Sprint',
            description: null,
            location: 'Main Hall',
            starts_at: '2026-06-23T10:00:00.000Z',
            ends_at: '2026-06-23T12:00:00.000Z',
            registration_opens_at: '2026-06-01T10:00:00.000Z',
            registration_closes_at: '2026-06-30T23:59:00.000Z',
            registration_mode: 'open',
          },
          registration_count: 12,
        }}
      />,
    )

    expect(screen.getByText('Summer Sprint')).toBeInTheDocument()
    expect(screen.getByText('Location:')).toBeInTheDocument()
    expect(screen.getByText('formatted:2026-06-23T10:00:00.000Z')).toBeInTheDocument()
    expect(screen.getByText('Registered:')).toBeInTheDocument()
    expect(screen.getByText('June 1')).toBeInTheDocument()
    expect(screen.getByText('June 30')).toBeInTheDocument()
  })

  it('renders the unavailable message and event code when the event cannot be loaded', () => {
    render(
      <EventHeaderCard
        slug="sample-event"
        isLoading={false}
        isError
        isGateReady={false}
        eventWindowText={null}
        availability={{ status: 'unavailable', reason: 'not_found_or_unpublished' }}
      />,
    )

    expect(screen.getByText('Register for This Event')).toBeInTheDocument()
    expect(screen.getByText('Event code:')).toBeInTheDocument()
    expect(screen.getByText('sample-event')).toBeInTheDocument()
    expect(screen.getAllByText('This event is unavailable right now.')).toHaveLength(2)
  })

  it('allows collapsing and expanding event registration info', () => {
    render(
      <EventHeaderCard
        isLoading={false}
        isError={false}
        isGateReady
        eventWindowText={{ opens: 'June 1', closes: 'June 30' }}
        availability={{
          status: 'available',
          event: {
            id: '3bfc2d8f-067f-4f6f-9403-f420f819eca7',
            slug: 'summer-sprint',
            title: 'Summer Sprint',
            description: null,
            location: 'Main Hall',
            starts_at: '2026-06-23T10:00:00.000Z',
            ends_at: '2026-06-23T12:00:00.000Z',
            registration_opens_at: '2026-06-01T10:00:00.000Z',
            registration_closes_at: '2026-06-30T23:59:00.000Z',
            registration_mode: 'open',
          },
          registration_count: 12,
        }}
      />,
    )

    expect(screen.getByText('Location:')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse event registration info' }))
    expect(screen.queryByText('Location:')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Expand event registration info' }))
    expect(screen.getByText('Location:')).toBeInTheDocument()
  })
})
