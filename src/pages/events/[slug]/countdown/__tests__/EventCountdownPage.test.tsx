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

    // Location Card
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Grand Ballroom, Level 3')).toBeInTheDocument();

    // Registration button
    const regButton = screen.getByRole('button', { name: /Go to Registration Page/i });
    fireEvent.click(regButton);
    expect(mockNavigate).toHaveBeenCalledWith('/events/tech-summit-2026/register');
  });

  it('renders "The Event has Started" view when event starts_at is reached', () => {
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
    const goRegButton = screen.getByRole('button', { name: /Go to Registration/i });
    fireEvent.click(goRegButton);
    expect(mockNavigate).toHaveBeenCalledWith('/events/started-event/register-public', {
      replace: true,
    });
  });
});
