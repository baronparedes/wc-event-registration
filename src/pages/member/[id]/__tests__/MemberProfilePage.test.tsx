import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminMember, makeMemberEventHistoryItem } from '@/__tests__/factories';
import { MemberProfilePage } from '@/pages/member/[id]';

const { mockUseParams, mockUseAdminMemberQuery, mockUseMemberEventHistoryQuery } = vi.hoisted(
  () => ({
    mockUseParams: vi.fn(),
    mockUseAdminMemberQuery: vi.fn(),
    mockUseMemberEventHistoryQuery: vi.fn(),
  }),
);

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => mockUseParams() };
});

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members');
  return {
    ...actual,
    useAdminMemberQuery: (...args: unknown[]) => mockUseAdminMemberQuery(...args),
    useMemberEventHistoryQuery: (...args: unknown[]) => mockUseMemberEventHistoryQuery(...args),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <MemberProfilePage />
    </MemoryRouter>,
  );
}

const member = makeAdminMember({ full_name: 'Jane Doe', member_id: 'WC-001', role: 'player' });

describe('MemberProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: member.id });
    mockUseAdminMemberQuery.mockReturnValue({ data: member, isLoading: false, isError: false });
    mockUseMemberEventHistoryQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
  });

  it('shows missing id state when id param is absent', () => {
    mockUseParams.mockReturnValue({});
    renderPage();
    expect(screen.getByText('Member ID is missing.')).toBeInTheDocument();
  });

  it('shows loading state while member query is in flight', () => {
    mockUseAdminMemberQuery.mockReturnValue({ data: null, isLoading: true, isError: false });
    renderPage();
    expect(screen.getByText('Loading member...')).toBeInTheDocument();
  });

  it('shows not found state on member query error', () => {
    mockUseAdminMemberQuery.mockReturnValue({ data: null, isLoading: false, isError: true });
    renderPage();
    expect(screen.getByText(/Member not found/i)).toBeInTheDocument();
  });

  it('renders member profile and Event History heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Event History' })).toBeInTheDocument();
    // full_name appears in breadcrumb and profile section; assert at least one
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('WC-001')).toBeInTheDocument();
    expect(screen.getByText('player')).toBeInTheDocument();
  });

  it('shows empty state when member has no event history', () => {
    renderPage();
    expect(screen.getByText('No events found for this member.')).toBeInTheDocument();
  });

  it('shows error state when history query fails', () => {
    mockUseMemberEventHistoryQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderPage();
    expect(screen.getByText('Failed to load event history.')).toBeInTheDocument();
  });

  it('renders an event card for each unique event in history', () => {
    const items = [
      makeMemberEventHistoryItem({ event_title: 'Alpha Training' }),
      makeMemberEventHistoryItem({ event_title: 'Beta Seminar' }),
    ];
    mockUseMemberEventHistoryQuery.mockReturnValue({
      data: items,
      isLoading: false,
      isError: false,
    });
    renderPage();
    expect(screen.getByText('Alpha Training')).toBeInTheDocument();
    expect(screen.getByText('Beta Seminar')).toBeInTheDocument();
  });

  it('groups multiple registrations for the same event into one card', () => {
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
    expect(screen.getAllByText('Shared Event')).toHaveLength(1);
    expect(screen.getByText('2 registrations')).toBeInTheDocument();
  });

  it('shows Event History count equal to number of unique events', () => {
    const items = [
      makeMemberEventHistoryItem({ event_title: 'Event One' }),
      makeMemberEventHistoryItem({ event_title: 'Event Two' }),
    ];
    mockUseMemberEventHistoryQuery.mockReturnValue({
      data: items,
      isLoading: false,
      isError: false,
    });
    renderPage();
    expect(screen.getByText('Event History (2)')).toBeInTheDocument();
  });
});
