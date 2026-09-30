import { faker } from '@faker-js/faker';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminMember, makeMemberEventHistoryItem } from '@/__tests__/factories';
import { ROUTE_PATHS } from '@/config/constants';
import { ProfilePage } from '@/pages/profile';
import { resolveProfileTab } from '@/pages/profile/utils';

const { mockUseCurrentProfileQuery, mockUseMemberEventHistoryQuery } = vi.hoisted(() => ({
  mockUseCurrentProfileQuery: vi.fn(),
  mockUseMemberEventHistoryQuery: vi.fn(),
}));

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));

vi.mock('@/hooks/domain/notifications', () => ({
  usePushSubscription: () => ({
    isSupported: true,
    isSubscribed: false,
    isLoading: false,
    subscribe: vi.fn(),
    subscribeAsync: vi.fn(),
    unsubscribe: vi.fn(),
    unsubscribeAsync: vi.fn(),
  }),
}));

vi.mock('@/hooks/domain/services', () => ({
  useServiceAttendanceQuery: () => ({ data: { pages: [] }, isLoading: false, isError: false }),
  useUserCommitmentHistoryQuery: () => ({ data: [], isLoading: false, isError: false }),
  useServiceExceptionDatesQuery: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members');
  return {
    ...actual,
    useCurrentProfileQuery: () => mockUseCurrentProfileQuery(),
    useMemberEventHistoryQuery: (memberId?: string) => mockUseMemberEventHistoryQuery(memberId),
    useGetMemberExcusedSchedule: () => ({ data: [], isLoading: false, isError: false }),
  };
});

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

function renderPage(initialEntry: string = ROUTE_PATHS.profile) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path={ROUTE_PATHS.profile}
          element={
            <>
              <ProfilePage />
              <LocationDisplay />
            </>
          }
        />
        <Route path={ROUTE_PATHS.home} element={<div>Home Page Destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const email = faker.internet.exampleEmail();
const member = makeAdminMember({
  member_id: 'MEM-100',
  email,
  role: 'Athlete',
  category: 'Adult',
  extra_metadata: { MembershipType: 'Gold' },
  has_account: true,
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
    expect(
      screen.getByRole('region', { name: /Welcome to CCF Hello Brochure Banner/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('avatar').parentElement?.parentElement).toContainElement(
      screen.getByRole('region', { name: /Welcome to CCF Hello Brochure Banner/i }),
    );
    expect(screen.getByText('8 Interactive Slides')).toBeInTheDocument();
    expect(screen.getByText('Explore →')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Personal Details' })).toBeInTheDocument();
    expect(screen.getByText(/Athlete/)).toBeInTheDocument();
    expect(screen.getByText(/Adult/)).toBeInTheDocument();
    expect(screen.getByText(email)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Info' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Commitments' })).toBeInTheDocument();
    expect(screen.getByLabelText('Verified account')).toBeInTheDocument();
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

  it('opens the details modal when clicking an event row', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'View Shared Event details' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Shared Event' }),
    ).toBeInTheDocument();
  });

  describe('Tab switching and URL query parameters', () => {
    it('resolves tab parameters correctly via resolveProfileTab', () => {
      expect(resolveProfileTab(null)).toBe('member_info');
      expect(resolveProfileTab('')).toBe('member_info');
      expect(resolveProfileTab('unknown')).toBe('member_info');
      expect(resolveProfileTab('info')).toBe('member_info');
      expect(resolveProfileTab('member_info')).toBe('member_info');
      expect(resolveProfileTab('commitments')).toBe('service_attendance');
      expect(resolveProfileTab('commitment')).toBe('service_attendance');
      expect(resolveProfileTab('service_attendance')).toBe('service_attendance');
      expect(resolveProfileTab('events')).toBe('events');
      expect(resolveProfileTab('event')).toBe('events');
      expect(resolveProfileTab('history')).toBe('events');
    });

    it('automatically selects the Commitments tab when URL has ?tab=commitments', () => {
      renderPage(`${ROUTE_PATHS.profile}?tab=commitments`);
      expect(screen.getByRole('tab', { name: 'Commitments' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(
        screen.getByRole('heading', { name: 'Service Commitment History' }),
      ).toBeInTheDocument();
    });

    it('automatically selects the Events tab when URL has ?tab=events', () => {
      renderPage(`${ROUTE_PATHS.profile}?tab=events`);
      expect(screen.getByRole('tab', { name: 'Events' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('heading', { name: /Event History/i })).toBeInTheDocument();
    });

    it('defaults to Info tab when ?tab is absent or invalid', () => {
      renderPage(`${ROUTE_PATHS.profile}?tab=invalid_tab_name`);
      expect(screen.getByRole('tab', { name: 'Info' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('heading', { name: 'Personal Details' })).toBeInTheDocument();
    });

    it('updates URL search parameters when switching tabs via UI clicks', () => {
      renderPage(ROUTE_PATHS.profile);
      expect(screen.getByTestId('location-search')).toHaveTextContent('');

      // Click Commitments tab
      fireEvent.click(screen.getByRole('tab', { name: 'Commitments' }));
      expect(screen.getByRole('tab', { name: 'Commitments' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=commitments');

      // Click Events tab
      fireEvent.click(screen.getByRole('tab', { name: 'Events' }));
      expect(screen.getByRole('tab', { name: 'Events' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=events');

      // Click Info tab (removes tab parameter)
      fireEvent.click(screen.getByRole('tab', { name: 'Info' }));
      expect(screen.getByRole('tab', { name: 'Info' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('location-search')).toHaveTextContent('');
    });
  });
});
