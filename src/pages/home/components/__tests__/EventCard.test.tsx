import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventCard } from '@/pages/home/components/EventCard';

const { mockNavigate, mockToastSuccess, mockToastError, mockClipboardWriteText } = vi.hoisted(
  () => ({
    mockNavigate: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockClipboardWriteText: vi.fn(),
  }),
);

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
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: mockClipboardWriteText,
      },
    });
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
});
