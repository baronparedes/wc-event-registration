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
      title: 'Hub Event 1',
      slug: 'hub-event-1',
      listingStatus: 'open',
      starts_at: '2023-01-01T10:00:00Z',
      ends_at: '2023-01-01T12:00:00Z',
      location: 'Main Hall',
      allow_public_registrations: true,
      registration_opens_at: '2022-12-01T10:00:00Z',
      registration_closes_at: '2022-12-31T10:00:00Z',
      description: null,
    },
    {
      type: 'form',
      id: '2',
      slug: 'hub-form-1',
      title: 'Hub Form 1',
      description: 'A test form description',
      status: 'published',
      duplicate_policy: 'allow_multiple',
      audience: 'members_and_public',
      metadata: {},
      created_by_admin_id: 'admin1',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  ];

  it('renders mixed items correctly', () => {
    render(
      <MemoryRouter>
        <HubSection items={mockItems} title="Mixed Section" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Mixed Section')).toBeInTheDocument();
    expect(screen.getByText('Hub Event 1')).toBeInTheDocument();
    expect(screen.getByText('Hub Form 1')).toBeInTheDocument();
  });

  it('renders nothing when empty', () => {
    const { container } = render(
      <MemoryRouter>
        <HubSection items={[]} title="Empty Section" />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
