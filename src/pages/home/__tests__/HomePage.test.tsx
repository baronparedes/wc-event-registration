import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from '@/pages/home';

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

const {
  mockUsePublicEventListingQuery,
  mockUsePublicFormsQuery,
  mockUseCurrentProfileQuery,
  mockEventSection,
  mockHubSection,
  mockPastEventList,
} = vi.hoisted(() => ({
  mockUsePublicEventListingQuery: vi.fn(),
  mockUsePublicFormsQuery: vi.fn(),
  mockUseCurrentProfileQuery: vi.fn(),
  mockEventSection: vi.fn(),
  mockHubSection: vi.fn(),
  mockPastEventList: vi.fn(),
}));

vi.mock('@/hooks/domain/events', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/events')>('@/hooks/domain/events');
  return {
    ...actual,
    usePublicEventListingQuery: () => mockUsePublicEventListingQuery(),
  };
});

vi.mock('@/hooks/domain/forms', () => ({
  usePublicFormsQuery: () => mockUsePublicFormsQuery(),
}));

vi.mock('@/hooks/domain/members', () => ({
  useCurrentProfileQuery: () => mockUseCurrentProfileQuery(),
}));

vi.mock('@/pages/home/components', () => ({
  EventSection: (props: { title: string; events: Array<{ id: string }> }) => {
    mockEventSection(props);
    return <div>{`${props.title}: ${props.events.length}`}</div>;
  },
  HubSection: (props: { title: string; items: Array<{ id: string }> }) => {
    mockHubSection(props);
    return <div>{`${props.title}: ${props.items.length}`}</div>;
  },
  PastEventList: (props: { events: Array<{ id: string }> }) => {
    mockPastEventList(props);
    return <div>{`Past Events List: ${props.events.length}`}</div>;
  },
  WelcomeHelloBanner: () => <div data-testid="welcome-hello-banner">Welcome Hello Banner</div>,
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentProfileQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
    mockUsePublicFormsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  it('splits events into open, upcoming, and past sections', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [
        { id: '1', listingStatus: 'open' },
        { id: '2', listingStatus: 'upcoming' },
        { id: '3', listingStatus: 'past' },
      ],
      isLoading: false,
      isError: false,
    });

    renderHomePage();

    expect(screen.getByText('Available Now: 2')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Events: 1')).toBeInTheDocument();
    expect(screen.getByText('Past Events List: 1')).toBeInTheDocument();
  });

  it('renders My Profile link when user is signed in and verified', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    mockUseCurrentProfileQuery.mockReturnValue({
      data: {
        id: 'member-1',
        member_id: 'MEM-001',
        full_name: 'Test User',
      },
      isLoading: false,
    });

    renderHomePage();

    expect(screen.getByRole('link', { name: 'My Profile →' })).toHaveAttribute('href', '/profile');
    expect(
      screen.getByText('View your profile, commitments, attendance, and events joined.'),
    ).toBeInTheDocument();
  });

  it('renders permanent excuse card in Available Now section when no other events are available', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    renderHomePage();

    expect(screen.getByText('Available Now: 1')).toBeInTheDocument();
    expect(mockHubSection).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Available Now',
        items: [
          expect.objectContaining({
            id: 'permanent-volunteer-excuse-request',
            type: 'excuse',
            title: 'Excuse Request',
          }),
        ],
      }),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'A community serving together.' }),
    ).toBeInTheDocument();
    const banner = screen.getByTestId('welcome-hello-banner');
    expect(banner).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Forms' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your member profile' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In →' })).toHaveAttribute('href', '/profile');
    expect(
      screen.getByText('Sign in to see your profile, commitments, attendance, and events joined.'),
    ).toBeInTheDocument();
    expect(
      banner.compareDocumentPosition(
        screen.getByRole('heading', { level: 1, name: 'A community serving together.' }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders loading skeleton state', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = renderHomePage();

    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(screen.queryByText('A quiet moment between activities')).not.toBeInTheDocument();
    expect(mockHubSection).not.toHaveBeenCalled();
    expect(mockPastEventList).not.toHaveBeenCalled();
    expect(screen.queryByText(/Available Now/)).not.toBeInTheDocument();
  });

  it('renders error state when listing query fails', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    renderHomePage();

    expect(screen.getByText('Unable to load events. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('A quiet moment between activities')).not.toBeInTheDocument();
  });

  it('mixes open events and published forms into Available Now section', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [{ id: 'event-1', listingStatus: 'open' }],
      isLoading: false,
      isError: false,
    });
    mockUsePublicFormsQuery.mockReturnValue({
      data: [
        { id: 'form-1', status: 'published', title: 'Survey' },
        { id: 'form-2', status: 'draft', title: 'Draft Survey' },
      ],
      isLoading: false,
      isError: false,
    });

    renderHomePage();

    expect(screen.getByText('Available Now: 3')).toBeInTheDocument();
    expect(mockHubSection).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Available Now',
        items: [
          expect.objectContaining({
            id: 'permanent-volunteer-excuse-request',
            type: 'excuse',
            title: 'Excuse Request',
          }),
          expect.objectContaining({ id: 'event-1', type: 'event' }),
          expect.objectContaining({ id: 'form-1', type: 'form' }),
        ],
      }),
    );
  });

  it('filters legacy excuse event and renders permanent excuse HubItem in Available Now section', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [
        {
          id: 'excuse-event-1',
          title: 'Excuse Request 2026',
          slug: 'excuse-request-2026',
          description: 'Submit Sunday excuse',
          listingStatus: 'open',
        },
      ],
      isLoading: false,
      isError: false,
    });

    renderHomePage();

    expect(screen.getByText('Available Now: 1')).toBeInTheDocument();
    expect(mockHubSection).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Available Now',
        items: [
          expect.objectContaining({
            id: 'permanent-volunteer-excuse-request',
            type: 'excuse',
            title: 'Excuse Request',
          }),
        ],
      }),
    );
  });

  it('renders loading skeleton when forms query is loading', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    mockUsePublicFormsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = renderHomePage();

    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(mockHubSection).not.toHaveBeenCalled();
    expect(mockPastEventList).not.toHaveBeenCalled();
    expect(screen.queryByText(/Available Now/)).not.toBeInTheDocument();
  });

  it('keeps past events visible alongside Available Now section', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [{ id: 'past-1', listingStatus: 'past' }],
      isLoading: false,
      isError: false,
    });
    mockUsePublicFormsQuery.mockReturnValue({
      data: [{ id: 'draft-1', status: 'draft' }],
      isLoading: false,
      isError: false,
    });

    renderHomePage();

    expect(screen.getByText('Available Now: 1')).toBeInTheDocument();
    expect(screen.getByText('Past Events List: 1')).toBeInTheDocument();
  });

  it('renders upcoming events alongside Available Now section', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [{ id: 'upcoming-1', listingStatus: 'upcoming' }],
      isLoading: false,
      isError: false,
    });

    renderHomePage();

    expect(screen.getByText('Available Now: 1')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Events: 1')).toBeInTheDocument();
  });

  it('shows a forms error without implying that no activities exist', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    mockUsePublicFormsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    renderHomePage();

    expect(screen.getByText('Unable to load forms. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('A quiet moment between activities')).not.toBeInTheDocument();
  });
});
