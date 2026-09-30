import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { PublicEventListingItem } from '@/lib/domain/events';

import { EventSection } from '../EventSection';

const mockEvents: PublicEventListingItem[] = [
  {
    id: 'event-1',
    title: 'Event 1',
    slug: 'event-1',
    listingStatus: 'open',
    starts_at: '2025-01-01T00:00:00Z',
    ends_at: '2025-01-01T01:00:00Z',
    registration_opens_at: '2024-12-01T00:00:00Z',
    registration_closes_at: '2024-12-31T00:00:00Z',
    location: null,
    allow_public_registrations: false,
    description: null,
  },
  {
    id: 'event-2',
    title: 'Event 2',
    slug: 'event-2',
    listingStatus: 'upcoming',
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2026-01-01T01:00:00Z',
    registration_opens_at: '2025-12-01T00:00:00Z',
    registration_closes_at: '2025-12-31T00:00:00Z',
    location: null,
    allow_public_registrations: false,
    description: null,
  },
];

describe('EventSection', () => {
  it('returns null and renders nothing when there are no events', () => {
    const { container } = render(<EventSection title="My Events" events={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title when events are provided', () => {
    render(
      <MemoryRouter>
        <EventSection title="My Upcoming Events" events={mockEvents} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'My Upcoming Events' })).toBeInTheDocument();
  });

  it('renders a list of EventCard components', () => {
    render(
      <MemoryRouter>
        <EventSection title="My Events" events={mockEvents} />
      </MemoryRouter>,
    );
    // Based on EventCard implementation, it renders the title in a heading.
    // The EventSection also renders a heading for the section.
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
  });
});
