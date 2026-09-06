import { render, screen } from '@testing-library/react';
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

  it('renders member details and event history', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'User Profile' })).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('MEM-100')).toBeInTheDocument();
    expect(screen.getByText('Athlete')).toBeInTheDocument();
    expect(screen.getByText('Adult')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('MembershipType')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();
  });

  it('renders event history items when present', () => {
    const items = [
      makeMemberEventHistoryItem({ event_title: 'Annual Championship' }),
    ];
    mockUseMemberEventHistoryQuery.mockReturnValue({
      data: items,
      isLoading: false,
      isError: false,
    });
    renderPage();
    expect(screen.getByText('Annual Championship')).toBeInTheDocument();
  });

  it('displays empty state when user has no event history', () => {
    renderPage();
    expect(screen.getByText('No events found.')).toBeInTheDocument();
  });
});
