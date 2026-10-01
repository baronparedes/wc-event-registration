import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { PublicEventListingItem } from '@/lib/domain/events';

import { EventSection } from '../EventSection';

describe('EventSection', () => {
  const mockEvents: PublicEventListingItem[] = [
    {
      id: '1',
      title: 'Test Event 1',
      slug: 'test-event-1',
      listingStatus: 'open',
      starts_at: '2023-12-01T10:00:00Z',
      registration_opens_at: '2023-11-01T10:00:00Z',
      registration_closes_at: '2023-11-30T10:00:00Z',
      allow_public_registrations: true,
      description: 'Test description 1',
      location: 'Test location 1',
    },
    {
      id: '2',
      title: 'Test Event 2',
      slug: 'test-event-2',
      listingStatus: 'upcoming',
      starts_at: '2024-01-01T10:00:00Z',
      registration_opens_at: '2023-12-01T10:00:00Z',
      registration_closes_at: '2023-12-31T10:00:00Z',
      allow_public_registrations: false,
      description: 'Test description 2',
      location: 'Test location 2',
    },
  ];

  it('renders null when events array is empty', () => {
    const { container } = render(
      <MemoryRouter>
        <EventSection title="Test Title" events={[]} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and event cards when events are provided', () => {
    render(
      <MemoryRouter>
        <EventSection title="My Events" events={mockEvents} />
      </MemoryRouter>,
    );

    // Verify title is rendered
    expect(screen.getByRole('heading', { level: 2, name: 'My Events' })).toBeInTheDocument();

    // Verify event cards are rendered by checking their titles
    expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    expect(screen.getByText('Test Event 2')).toBeInTheDocument();
  });
});
