import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from '@/pages/home';

const { mockUsePublicEventListingQuery, mockUsePublicFormsQuery, mockEventSection } = vi.hoisted(
  () => ({
    mockUsePublicEventListingQuery: vi.fn(),
    mockUsePublicFormsQuery: vi.fn(),
    mockEventSection: vi.fn(),
  }),
);

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

    render(<HomePage />);

    expect(screen.getByText('Open for Registration: 1')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Events: 1')).toBeInTheDocument();
    expect(screen.getByText('Past 3 Months: 1')).toBeInTheDocument();
  });

  it('renders empty-state text when no events are available', () => {
    mockUsePublicEventListingQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<HomePage />);

    expect(screen.getByText('No items available')).toBeInTheDocument();
    expect(
      screen.getByText('There are currently no open events or active forms. Check back soon!'),
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
