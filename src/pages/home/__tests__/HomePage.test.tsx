import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from '@/pages/home';

const { mockUsePublicEventListingQuery, mockEventSection } = vi.hoisted(() => ({
  mockUsePublicEventListingQuery: vi.fn(),
  mockEventSection: vi.fn(),
}));

vi.mock('@/hooks/domain/events', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/events')>('@/hooks/domain/events');
  return {
    ...actual,
    usePublicEventListingQuery: () => mockUsePublicEventListingQuery(),
  };
});

vi.mock('@/pages/home/components', () => ({
  EventSection: (props: { title: string; events: Array<{ id: string }> }) => {
    mockEventSection(props);
    return <div>{`${props.title}: ${props.events.length}`}</div>;
  },
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    render(<HomePage />);

    expect(screen.getByText('Open for Registration: 1')).toBeInTheDocument();
    expect(screen.getByText('Upcoming: 1')).toBeInTheDocument();
    expect(screen.getByText('Past 3 Months: 1')).toBeInTheDocument();
  });

  it('renders empty-state text when no events are available', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<HomePage />);

    expect(screen.getByText('No events available')).toBeInTheDocument();
    expect(
      screen.getByText('There are currently no open, upcoming, or recent events. Check back soon!'),
    ).toBeInTheDocument();
  });

  it('renders loading skeleton state', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<HomePage />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('renders error state when listing query fails', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<HomePage />);

    expect(screen.getByText('Unable to load events. Please try again.')).toBeInTheDocument();
  });
});
