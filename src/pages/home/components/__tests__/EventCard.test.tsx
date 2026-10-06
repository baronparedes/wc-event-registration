import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventCard } from '@/pages/home/components/EventCard';

const { mockNavigate, mockToastSuccess, mockToastError, mockClipboardWriteText, mockNativeShare } =
  vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockClipboardWriteText: vi.fn(),
    mockNativeShare: vi.fn(),
  }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({
      children,
      to,
      ...props
    }: {
      children?: React.ReactNode;
      to: string;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

const baseEvent = {
  id: 'event-1',
  slug: 'summer-2026',
  title: 'Summer Gathering',
  description: 'Community event',
  location: 'Main Hall',
  starts_at: '2026-08-15T09:00:00.000Z',
  ends_at: '2026-08-15T12:00:00.000Z',
  registration_opens_at: '2026-08-01T00:00:00.000Z',
  registration_closes_at: '2026-08-14T23:59:00.000Z',
  allow_public_registrations: true,
  listingStatus: 'open' as const,
};

describe('EventCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: mockClipboardWriteText,
      },
    });
  });

  it('renders event details and registration actions for an open event', () => {
    const { container } = render(<EventCard event={baseEvent} />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Summer Gathering' })).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show details for Summer Gathering' }));
    expect(screen.getByText('Community event')).toBeInTheDocument();
    expect(screen.getByText('Main Hall')).toBeInTheDocument();
    expect(screen.getByText('Open to Guests')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register Now' })).toHaveAttribute(
      'href',
      '/events/summer-2026/register',
    );
    expect(screen.getByText('Event date')).toBeInTheDocument();
    expect(screen.getByText('Registration opens')).toBeInTheDocument();
    expect(screen.getByText('Registration closes')).toBeInTheDocument();
  });

  it('navigates when an open card is clicked or activated with the keyboard', () => {
    render(<EventCard event={baseEvent} />);

    const card = screen.getAllByRole('link')[0];
    fireEvent.click(screen.getByRole('heading', { name: 'Summer Gathering' }));
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    expect(mockNavigate).toHaveBeenCalledTimes(3);
    expect(mockNavigate).toHaveBeenCalledWith('/events/summer-2026/register');
  });

  it('toggles details without navigating to registration', () => {
    render(<EventCard event={baseEvent} />);

    const detailsButton = screen.getByRole('button', { name: 'Show details for Summer Gathering' });
    expect(detailsButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Community event')).not.toBeVisible();

    fireEvent.click(detailsButton);
    fireEvent.keyDown(detailsButton, { key: 'Enter' });
    expect(detailsButton).toHaveAttribute('aria-expanded', 'true');
    expect(detailsButton).toHaveAccessibleName('Hide details for Summer Gathering');
    expect(screen.getByText('Community event')).toBeVisible();
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(detailsButton);
    expect(screen.getByText('Community event')).not.toBeVisible();
  });

  it('uses the Manila event date for its badge', () => {
    const { container } = render(
      <EventCard event={{ ...baseEvent, starts_at: '2026-08-15T18:00:00.000Z' }} />,
    );

    expect(container.querySelector('time')).toHaveTextContent('Sun16Aug 2026');
    expect(container.querySelector('time')).toHaveTextContent('2:00 AM');
  });

  it('shows matching start and end badges for an event spanning three Manila dates', () => {
    const { container } = render(
      <EventCard
        event={{
          ...baseEvent,
          starts_at: '2026-08-15T18:00:00.000Z',
          ends_at: '2026-08-17T16:30:00.000Z',
        }}
      />,
    );

    const badges = container.querySelectorAll('time');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent('FromSun16Aug 2026');
    expect(badges[1]).toHaveTextContent('ToTue18Aug 2026');
    expect(badges[0]).toHaveTextContent('2:00 AM');
    expect(badges[1]).toHaveTextContent('12:30 AM');
    expect(badges[1]).toHaveAttribute('aria-label', 'Ends Aug 18, 2026, 12:30 AM');
    expect(screen.getByText('From')).toHaveClass('text-[9px]', 'text-muted');
    expect(screen.getByText('To')).toHaveClass('text-[9px]', 'text-muted');
    expect(screen.getByText('From')).not.toHaveClass('bg-gray-100');
    expect(screen.getByText('To')).not.toHaveClass('bg-gray-100');
    expect(badges[1]).toHaveAttribute('datetime', '2026-08-17T16:30:00.000Z');
    expect(badges[0].className).toBe(badges[1].className);
  });

  it('shows both times within one badge for a single-day event', () => {
    const { container } = render(<EventCard event={baseEvent} />);

    const badges = container.querySelectorAll('time');
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent('5:00 PM to 8:00 PM');
    expect(badges[0]).toHaveClass('w-[148px]', 'sm:w-[168px]');
    expect(badges[0]).toHaveAttribute('aria-label', 'Starts Aug 15, 2026, 5:00 PM to 8:00 PM');
  });

  it('uses the Manila calendar day when showing a single-day time range', () => {
    const { container } = render(
      <EventCard
        event={{
          ...baseEvent,
          starts_at: '2026-08-15T16:30:00.000Z',
          ends_at: '2026-08-16T01:00:00.000Z',
        }}
      />,
    );

    expect(container.querySelector('time')).toHaveTextContent('12:30 AM to 9:00 AM');
  });

  it.each([
    ['identical times', baseEvent.starts_at],
    ['different Manila dates', '2026-08-15T18:00:00.000Z'],
    ['end before start', '2026-08-15T08:00:00.000Z'],
    ['missing end', null],
    ['invalid end', 'not-a-date'],
  ])('does not add a time range for %s', (_scenario, endsAt) => {
    const { container } = render(<EventCard event={{ ...baseEvent, ends_at: endsAt }} />);

    expect(container.querySelector('time')).not.toHaveTextContent('to ');
  });

  it.each([
    ['same-day', '2026-08-15T12:00:00.000Z'],
    ['two-day', '2026-08-16T12:00:00.000Z'],
    ['missing end date', null],
    ['invalid end date', 'not-a-date'],
    ['end before start', '2026-08-14T12:00:00.000Z'],
  ])('keeps one badge for an event with %s', (_scenario, endsAt) => {
    const { container } = render(<EventCard event={{ ...baseEvent, ends_at: endsAt }} />);
    expect(container.querySelectorAll('time')).toHaveLength(1);
  });

  it('renders optional details only when provided and labels upcoming events', () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          description: null,
          location: null,
          starts_at: null,
          allow_public_registrations: false,
          listingStatus: 'upcoming',
        }}
      />,
    );

    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.queryByText('Community event')).not.toBeInTheDocument();
    expect(screen.queryByText('Main Hall')).not.toBeInTheDocument();
    expect(screen.queryByText('Event date')).not.toBeInTheDocument();
    expect(screen.queryByText('Open to Guests')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Register Now' })).not.toBeInTheDocument();
  });

  it('copies the event link and does not trigger card navigation when share is clicked', async () => {
    mockClipboardWriteText.mockResolvedValueOnce(undefined);

    render(<EventCard event={baseEvent} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share Summer Gathering' }));

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith(
        'http://localhost:3000/events/summer-2026/register',
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Event link copied to clipboard.');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows an error toast when clipboard fallback fails', async () => {
    mockClipboardWriteText.mockRejectedValueOnce(new Error('clipboard failed'));

    render(<EventCard event={baseEvent} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share Summer Gathering' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to share event link.');
    });
  });

  it('uses native sharing when it is available', async () => {
    mockNativeShare.mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: mockNativeShare,
    });

    render(<EventCard event={baseEvent} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share Summer Gathering' }));

    await waitFor(() => {
      expect(mockNativeShare).toHaveBeenCalledWith({
        title: 'Summer Gathering',
        url: 'http://localhost:3000/events/summer-2026/register',
      });
    });
    expect(mockClipboardWriteText).not.toHaveBeenCalled();
  });

  it('does not show an error when native sharing is cancelled', async () => {
    mockNativeShare.mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'));
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: mockNativeShare,
    });

    render(<EventCard event={baseEvent} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share Summer Gathering' }));

    await waitFor(() => expect(mockNativeShare).toHaveBeenCalled());
    expect(mockClipboardWriteText).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('falls back to the clipboard when native sharing fails', async () => {
    mockNativeShare.mockRejectedValueOnce(new Error('native share failed'));
    mockClipboardWriteText.mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: mockNativeShare,
    });

    render(<EventCard event={baseEvent} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share Summer Gathering' }));

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith(
        'http://localhost:3000/events/summer-2026/register',
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('Event link copied to clipboard.');
  });

  it('does not render the share button for non-open events', () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          listingStatus: 'upcoming',
        }}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Share Summer Gathering' }),
    ).not.toBeInTheDocument();
  });

  it('does not navigate when a past card is clicked or activated with the keyboard', () => {
    const { container } = render(
      <EventCard
        event={{
          ...baseEvent,
          listingStatus: 'past',
        }}
      />,
    );

    const card = container.firstElementChild as HTMLElement;
    fireEvent.click(screen.getByRole('heading', { name: 'Summer Gathering' }));
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    expect(screen.getByText('Past')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders countdown button for open and upcoming events and links to countdown page', () => {
    const { rerender } = render(<EventCard event={baseEvent} />);

    const countdownLink = screen.getByRole('link', {
      name: 'View countdown for Summer Gathering',
    });
    expect(countdownLink).toHaveAttribute('href', '/events/summer-2026/countdown');

    rerender(
      <EventCard
        event={{
          ...baseEvent,
          listingStatus: 'upcoming',
        }}
      />,
    );

    expect(
      screen.getByRole('link', { name: 'View countdown for Summer Gathering' }),
    ).toBeInTheDocument();

    rerender(
      <EventCard
        event={{
          ...baseEvent,
          listingStatus: 'past',
        }}
      />,
    );

    expect(
      screen.queryByRole('link', { name: 'View countdown for Summer Gathering' }),
    ).not.toBeInTheDocument();
  });

  it('renders custom cover photo in background style when cover_image_key is provided', () => {
    const { container } = render(
      <EventCard
        event={{
          ...baseEvent,
          cover_image_key: 'covers/custom-cover.jpg',
        }}
      />,
    );

    const backgroundDiv = container.querySelector('[style*="background-image"]');
    expect(backgroundDiv).toBeInTheDocument();
  });
});
