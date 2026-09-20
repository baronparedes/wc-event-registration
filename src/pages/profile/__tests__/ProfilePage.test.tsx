import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminMember, makeMemberEventHistoryItem } from '@/__tests__/factories';
import { ROUTE_PATHS } from '@/config/constants';
import { ProfilePage } from '@/pages/profile';

const { mockUseCurrentProfileQuery, mockUseMemberEventHistoryQuery } = vi.hoisted(() => ({
  mockUseCurrentProfileQuery: vi.fn(),
  mockUseMemberEventHistoryQuery: vi.fn(),
}));

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members');
  return {
    ...actual,
    useCurrentProfileQuery: () => mockUseCurrentProfileQuery(),
    useMemberEventHistoryQuery: (...args: unknown[]) => mockUseMemberEventHistoryQuery(...args),
  };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[ROUTE_PATHS.profile]}>
      <Routes>
        <Route path={ROUTE_PATHS.profile} element={<ProfilePage />} />
        <Route path={ROUTE_PATHS.home} element={<div>Home Page Destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const member = makeAdminMember({
  full_name: 'John Doe',
  member_id: 'MEM-100',
  role: 'Athlete',
  category: 'Adult',
  email: 'john@example.com',
  extra_metadata: { MembershipType: 'Gold' },
});

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentProfileQuery.mockReturnValue({ data: member, isLoading: false, isError: false });
    mockUseMemberEventHistoryQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
  });

  it('shows loading state while profile query is loading', () => {
    mockUseCurrentProfileQuery.mockReturnValue({ data: null, isLoading: true, isError: false });
    renderPage();
    expect(screen.getByText('Loading member...')).toBeInTheDocument();
  });

  it('redirects to home page when profile query returns null or error', () => {
    mockUseCurrentProfileQuery.mockReturnValue({ data: null, isLoading: false, isError: false });
    renderPage();
    expect(screen.getByText('Home Page Destination')).toBeInTheDocument();
  });

  it('renders member details and tab triggers', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Personal Details' })).toBeInTheDocument();
    expect(screen.getByText(/Athlete/)).toBeInTheDocument();
    expect(screen.getByText(/Adult/)).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Membershiptype')).toBeInTheDocument(); // Title Cased as defined by toTitleCase helper
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Info' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Commitments' })).toBeInTheDocument();
  });

  it('renders event history items when present', () => {
    const items = [makeMemberEventHistoryItem({ event_title: 'Annual Championship' })];
    mockUseMemberEventHistoryQuery.mockReturnValue({
      data: items,
      isLoading: false,
      isError: false,
    });
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Events' }));
    expect(screen.getByText('Annual Championship')).toBeInTheDocument();
  });

  it('displays empty state when user has no event history', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Events' }));
    expect(screen.getByText('No events found.')).toBeInTheDocument();
  });

  it('opens modal when clicking View on a group card', async () => {
    const eventId = 'shared-event-id';
    const items = [
      makeMemberEventHistoryItem({ event_id: eventId, event_title: 'Shared Event' }),
      makeMemberEventHistoryItem({ event_id: eventId, event_title: 'Shared Event' }),
    ];
    mockUseMemberEventHistoryQuery.mockReturnValue({
      data: items,
      isLoading: false,
      isError: false,
    });
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Events' }));

    expect(
      screen.queryByRole('heading', { level: 2, name: 'Shared Event' }),
    ).not.toBeInTheDocument();

    const viewButton = screen.getByRole('button', { name: 'View' });
    fireEvent.click(viewButton);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Shared Event' }),
    ).toBeInTheDocument();
  });
});
