import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { PublicEventListingItem } from '@/lib/domain/events';

import { PastEventList } from '../PastEventList';

describe('PastEventList', () => {
  const mockEvents: PublicEventListingItem[] = [
    {
      id: '1',
      title: 'Past Event 1',
      slug: 'past-event-1',
      listingStatus: 'past',
      starts_at: '2023-01-01T10:00:00Z',
      ends_at: '2023-01-01T12:00:00Z',
      location: 'Main Hall',
      allow_public_registrations: true,
      registration_opens_at: '2022-12-01T10:00:00Z',
      registration_closes_at: '2022-12-31T10:00:00Z',
      description: null,
    },
  ];

  it('renders past events in a list', () => {
    render(
      <MemoryRouter>
        <PastEventList events={mockEvents} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Past Events (Last 3 Months)')).toBeInTheDocument();
    expect(screen.getByText('Past Event 1')).toBeInTheDocument();
    expect(screen.getByText('Main Hall')).toBeInTheDocument();
  });

  it('renders nothing when empty', () => {
    const { container } = render(
      <MemoryRouter>
        <PastEventList events={[]} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
