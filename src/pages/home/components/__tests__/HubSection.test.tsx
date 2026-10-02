import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { HubItem } from '@/pages/home/components/HubSection';
import { HubSection } from '@/pages/home/components/HubSection';

describe('HubSection', () => {
  const mockItems: HubItem[] = [
    {
      type: 'event',
      id: '1',
      title: 'Test Event 1',
      slug: 'test-event-1',
      listingStatus: 'open',
      starts_at: '2023-12-01T10:00:00Z',
      ends_at: '2023-12-01T12:00:00Z',
      registration_opens_at: '2023-11-01T10:00:00Z',
      registration_closes_at: '2023-11-30T10:00:00Z',
      allow_public_registrations: true,
      description: 'Test description 1',
      location: 'Test location 1',
    },
    {
      type: 'form',
      id: '2',
      title: 'Test Form 1',
      slug: 'test-form-1',
      description: 'Test form description 1',
      status: 'published',
      audience: 'members_and_public',
      duplicate_policy: 'allow_multiple',
      metadata: {},
      created_by_admin_id: null,
      updated_at: '2023-11-01T10:00:00Z',
      created_at: '2023-11-01T10:00:00Z',
    },
  ];

  it('renders null when items array is empty', () => {
    const { container } = render(
      <MemoryRouter>
        <HubSection title="Test Hub" items={[]} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and mixed cards when items are provided', () => {
    render(
      <MemoryRouter>
        <HubSection title="My Hub" items={mockItems} />
      </MemoryRouter>,
    );

    // Verify title is rendered
    expect(screen.getByRole('heading', { level: 2, name: 'My Hub' })).toBeInTheDocument();

    // Verify event card is rendered
    expect(screen.getByText('Test Event 1')).toBeInTheDocument();

    // Verify form card is rendered
    expect(screen.getByText('Test Form 1')).toBeInTheDocument();
  });

  it('renders nothing for an unknown item type', () => {
    const unknownItem = { type: 'unknown', id: '3', title: 'Unknown' } as unknown as HubItem;
    render(
      <MemoryRouter>
        <HubSection title="Unknown Items" items={[unknownItem]} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Unknown Items' })).toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('presents Excuse Request 2026 as a form while keeping its event registration route', () => {
    const event = mockItems[0];
    if (event.type !== 'event') throw new Error('Expected event fixture');
    const { container } = render(
      <MemoryRouter>
        <HubSection
          title="Available Now"
          items={[{ ...event, title: 'Excuse Request 2026', slug: 'excuse-request-2026' }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Fill out' })).toHaveAttribute(
      'href',
      '/events/excuse-request-2026/register',
    );
    expect(container.querySelector('time')).toBeNull();
    expect(screen.queryByText(event.location ?? '')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /countdown/i })).not.toBeInTheDocument();
  });

  it('does not enable the form-style action before excuse registration opens', () => {
    const event = mockItems[0];
    if (event.type !== 'event') throw new Error('Expected event fixture');
    render(
      <MemoryRouter>
        <HubSection
          title="Upcoming Events"
          items={[{ ...event, title: 'Excuse Request 2026', listingStatus: 'upcoming' }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Fill out' })).not.toBeInTheDocument();
  });
});
