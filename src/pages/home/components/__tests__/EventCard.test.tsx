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
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
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
    render(<EventCard event={baseEvent} />);

    expect(screen.getByRole('heading', { name: 'Summer Gathering' })).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
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

  it('does not navigate when a past card is clicked', () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          listingStatus: 'past',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('heading', { name: 'Summer Gathering' }));

    expect(screen.getByText('Past')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
