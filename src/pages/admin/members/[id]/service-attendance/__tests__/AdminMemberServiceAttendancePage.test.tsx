import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';

import { AdminMemberServiceAttendancePage } from '../index';

const { mockUseParams, mockUseAdminMemberQuery } = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockUseAdminMemberQuery: vi.fn(),
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
    useMemberAvatarQuery: () => ({ data: null }),
  };
});

vi.mock('@/pages/profile/components/ServiceAttendanceHistoryTab', () => ({
  ServiceAttendanceHistoryTab: ({ memberId }: { memberId: string }) => (
    <div data-testid="service-attendance-history-tab">Service Attendance for {memberId}</div>
  ),
}));

const member = makeAdminMember({ id: 'user-123', full_name: 'John Smith', member_id: 'WC-007' });

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/admin/members/${member.id}/service-attendance`]}>
      <AdminMemberServiceAttendancePage />
    </MemoryRouter>,
  );
}

describe('AdminMemberServiceAttendancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: member.id });
    mockUseAdminMemberQuery.mockReturnValue({ data: member, isLoading: false, isError: false });
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

  it('renders header with breadcrumbs, navigation links, and ServiceAttendanceHistoryTab', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Service Commitment History' })).toBeInTheDocument();
    expect(
      screen.getByText("Member's church service attendance and seat assignments."),
    ).toBeInTheDocument();

    // Breadcrumbs and links
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('href', '/admin/members');
    expect(screen.getByRole('link', { name: 'John Smith' })).toHaveAttribute(
      'href',
      `/admin/members/${member.id}`,
    );

    // Sub-navigation links
    expect(screen.getByRole('link', { name: 'Member Profile' })).toHaveAttribute(
      'href',
      `/admin/members/${member.id}`,
    );
    expect(screen.getByRole('link', { name: 'Service Attendance' })).toHaveAttribute(
      'href',
      `/admin/members/${member.id}/service-attendance`,
    );
    expect(screen.getByRole('link', { name: 'Event History' })).toHaveAttribute(
      'href',
      `/admin/members/${member.id}/event-history`,
    );

    // Member overview card
    expect(screen.getByText('WC-007')).toBeInTheDocument();

    // Content
    expect(screen.getByTestId('service-attendance-history-tab')).toHaveTextContent(
      `Service Attendance for ${member.id}`,
    );
  });
});
