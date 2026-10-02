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
  mockEventSection,
  mockHubSection,
  mockPastEventList,
} = vi.hoisted(() => ({
  mockUsePublicEventListingQuery: vi.fn(),
  mockUsePublicFormsQuery: vi.fn(),
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

    expect(screen.getByText('Available Now: 1')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Events: 1')).toBeInTheDocument();
    expect(screen.getByText('Past Events List: 1')).toBeInTheDocument();
  });

  it('renders empty-state text when no events are available', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    renderHomePage();

    expect(screen.getByText('A quiet moment between activities')).toBeInTheDocument();
    expect(
      screen.getByText('There are no open registrations or forms right now.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'A community serving together.' }),
    ).toBeInTheDocument();
    const banner = screen.getByTestId('welcome-hello-banner');
    expect(banner).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Forms' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your member profile' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In \u2192' })).toHaveAttribute(
      'href',
      '/profile',
    );
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

    expect(screen.getByText('Available Now: 2')).toBeInTheDocument();
    expect(mockHubSection).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Available Now',
        items: [
          expect.objectContaining({ id: 'event-1', type: 'event' }),
          expect.objectContaining({ id: 'form-1', type: 'form' }),
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
    expect(screen.queryByText('A quiet moment between activities')).not.toBeInTheDocument();
  });

  it('keeps past events visible alongside the empty activity state', () => {
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

    expect(screen.getByText('A quiet moment between activities')).toBeInTheDocument();
    expect(screen.getByText('Past Events List: 1')).toBeInTheDocument();
  });

  it('does not show the empty activity state when upcoming events exist', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [{ id: 'upcoming-1', listingStatus: 'upcoming' }],
      isLoading: false,
      isError: false,
    });

    renderHomePage();

    expect(screen.getByText('Upcoming Events: 1')).toBeInTheDocument();
    expect(screen.queryByText('A quiet moment between activities')).not.toBeInTheDocument();
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
