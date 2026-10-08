import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventCountdownPage } from '../index';

const { mockUseParams, mockNavigate, mockUsePublicEventQuery } = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockNavigate: vi.fn(),
  mockUsePublicEventQuery: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/domain/events', () => ({
  usePublicEventQuery: (...args: unknown[]) => mockUsePublicEventQuery(...args),
}));

describe('EventCountdownPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseParams.mockReturnValue({ slug: 'tech-summit-2026' });
  });

  it('renders loading skeleton when query is loading', () => {
    mockUsePublicEventQuery.mockReturnValue({
      isLoading: true,
      isError: false,
      data: null,
    });

    const { container } = render(<EventCountdownPage />);
    expect(container.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(0);
  });

  it('renders empty state when event is unavailable or not found', () => {
    mockUsePublicEventQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        status: 'unavailable',
        reason: 'not_found_or_unpublished',
      },
    });

    render(<EventCountdownPage />);
    expect(screen.getByText('Event Unavailable')).toBeInTheDocument();

    const homeButton = screen.getByRole('button', { name: /Back to Home/i });
    fireEvent.click(homeButton);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('renders countdown timer and all event detail cards (Schedule, Location, Registration Window)', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(); // 48 hours later
    const endDate = new Date(Date.now() + 1000 * 60 * 60 * 52).toISOString();
    const opensAt = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const closesAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    mockUsePublicEventQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        status: 'available',
        event: {
          id: 'evt-1',
          slug: 'tech-summit-2026',
          title: 'Tech Summit 2026',
          description: 'Annual developer conference.',
          location: 'Grand Ballroom, Level 3',
          starts_at: futureDate,
          ends_at: endDate,
          registration_opens_at: opensAt,
          registration_closes_at: closesAt,
          registration_mode: 'open',
          status: 'published',
          duplicate_policy: 'allow_multiple',
          require_id_lookup: true,
          allow_public_registrations: true,
          metadata: {},
          created_by_admin_id: 'admin-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    });

    render(<EventCountdownPage />);

    expect(screen.getByText('Tech Summit 2026')).toBeInTheDocument();
    expect(screen.getByText(/Annual developer conference/)).toBeInTheDocument();

    // Countdown labels
    expect(screen.getByText('Days')).toBeInTheDocument();
    expect(screen.getByText('Hours')).toBeInTheDocument();
    expect(screen.getByText('Minutes')).toBeInTheDocument();
    expect(screen.getByText('Seconds')).toBeInTheDocument();

    // Location badge
    expect(screen.getByText('Grand Ballroom, Level 3')).toBeInTheDocument();

    // Share Countdown button
    const shareButton = screen.getByRole('button', { name: /Share/i });
    expect(shareButton).toBeInTheDocument();
    fireEvent.click(shareButton);
    expect(screen.getByRole('heading', { name: 'Share Event Countdown' })).toBeInTheDocument();

    // Home buttons
    const homeButtons = screen.getAllByRole('button', { name: /Go Home/i });
    expect(homeButtons.length).toBe(1);
    fireEvent.click(homeButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/');

    // Registration button
    const regButton = screen.getByRole('button', { name: /Go to Registration Page/i });
    fireEvent.click(regButton);
    expect(mockNavigate).toHaveBeenCalledWith('/events/tech-summit-2026/register');
  });

  it('renders "The Event has Started" view with Go Home button when event starts_at is reached', () => {
    const pastStart = new Date(Date.now() - 1000 * 30).toISOString(); // 30 seconds ago (same calendar day)

    mockUsePublicEventQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        status: 'available',
        event: {
          id: 'evt-2',
          slug: 'started-event',
          title: 'Live Workshop',
          description: 'Workshop ongoing',
          location: 'Hall A',
          starts_at: pastStart,
          ends_at: null,
          registration_opens_at: null,
          registration_closes_at: null,
          registration_mode: 'open',
          status: 'published',
          duplicate_policy: 'allow_multiple',
          require_id_lookup: true,
          allow_public_registrations: true,
          metadata: {},
          created_by_admin_id: 'admin-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    });

    render(<EventCountdownPage />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('The Event has Started')).toBeInTheDocument();

    const homeButton = screen.getByRole('button', { name: /Go Home/i });
    fireEvent.click(homeButton);
    expect(mockNavigate).toHaveBeenCalledWith('/');

    const goRegButton = screen.getByRole('button', { name: /Go to Registration/i });
    fireEvent.click(goRegButton);
    expect(mockNavigate).toHaveBeenCalledWith('/events/started-event/register-public', {
      replace: true,
    });
  });

  it('renders countdown timer and Registration Not Open badge when registration is not open yet', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();
    const futureOpensAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    mockUsePublicEventQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        status: 'unavailable',
        reason: 'not_open_yet',
        event: {
          id: 'evt-upcoming',
          slug: 'upcoming-conference',
          title: 'Upcoming Conference 2026',
          description: 'Coming soon.',
          location: 'Main Auditorium',
          starts_at: futureDate,
          ends_at: null,
          registration_opens_at: futureOpensAt,
          registration_closes_at: null,
          registration_mode: 'open',
          status: 'published',
          duplicate_policy: 'allow_multiple',
          require_id_lookup: true,
          allow_public_registrations: true,
          metadata: {},
          created_by_admin_id: 'admin-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    });

    render(<EventCountdownPage />);

    expect(screen.getByText('Upcoming Conference 2026')).toBeInTheDocument();
    expect(screen.getByText('Days')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('Main Auditorium')).toBeInTheDocument();
    expect(screen.getByText('Registration Not Open')).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /Go to Registration Page/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go Home/i })).toBeInTheDocument();
  });

  it('renders countdown timer and Registration Closed badge when registration is closed but event is upcoming', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();
    const pastClosesAt = new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString();

    mockUsePublicEventQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        status: 'unavailable',
        reason: 'registration_closed',
        event: {
          id: 'evt-closed-upcoming',
          slug: 'closed-upcoming-event',
          title: 'Closed Upcoming Event',
          description: 'Registration already closed.',
          location: 'Conference Hall',
          starts_at: futureDate,
          ends_at: null,
          registration_opens_at: null,
          registration_closes_at: pastClosesAt,
          registration_mode: 'closed',
          status: 'published',
          duplicate_policy: 'allow_multiple',
          require_id_lookup: true,
          allow_public_registrations: true,
          metadata: {},
          created_by_admin_id: 'admin-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    });

    render(<EventCountdownPage />);

    expect(screen.getByText('Closed Upcoming Event')).toBeInTheDocument();
    expect(screen.getByText('Registration Closed')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Go to Registration Page/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go Home/i })).toBeInTheDocument();
  });

  it('renders "The Event has Started" view with registration closed message when registration is closed', () => {
    const pastStart = new Date(Date.now() - 1000 * 30).toISOString();

    mockUsePublicEventQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        status: 'unavailable',
        reason: 'registration_closed',
        event: {
          id: 'evt-started-closed',
          slug: 'started-closed-event',
          title: 'Started Closed Event',
          description: 'Event is live but closed.',
          location: 'Hall B',
          starts_at: pastStart,
          ends_at: null,
          registration_opens_at: null,
          registration_closes_at: null,
          registration_mode: 'closed',
          status: 'published',
          duplicate_policy: 'allow_multiple',
          require_id_lookup: true,
          allow_public_registrations: true,
          metadata: {},
          created_by_admin_id: 'admin-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    });

    render(<EventCountdownPage />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('The Event has Started')).toBeInTheDocument();
    expect(screen.getByText('Registration for this event is closed.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Go to Registration/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go Home/i })).toBeInTheDocument();
  });

  it('renders cover photo when cover_image_key is present', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();

    mockUsePublicEventQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        status: 'available',
        event: {
          id: 'evt-cover',
          slug: 'tech-summit-2026',
          title: 'Tech Summit 2026',
          description: 'Annual developer conference.',
          location: 'Grand Ballroom',
          starts_at: futureDate,
          ends_at: null,
          registration_opens_at: null,
          registration_closes_at: null,
          registration_mode: 'open',
          status: 'published',
          duplicate_policy: 'allow_multiple',
          require_id_lookup: true,
          allow_public_registrations: true,
          cover_image_key: 'covers/tech-summit.jpg',
          metadata: {},
          created_by_admin_id: 'admin-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    });

    render(<EventCountdownPage />);
    const img = screen.getByAltText('Tech Summit 2026');
    expect(img).toBeInTheDocument();
  });
});
