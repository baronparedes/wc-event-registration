import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { HubItem } from '../HubSection';
import { HubSection } from '../HubSection';

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
});
