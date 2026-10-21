import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MemberDGroupAnalytics, MemberDGroupRow } from '@/lib/domain/members';

import { MemberDGroupSection } from '../MemberDGroupSection';

const { mockUseIsMobileViewport } = vi.hoisted(() => ({
  mockUseIsMobileViewport: vi.fn(),
}));

vi.mock('@/hooks/utils', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/utils')>('@/hooks/utils');
  return {
    ...actual,
    useIsMobileViewport: () => mockUseIsMobileViewport(),
  };
});

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

function createMemberRow(overrides: Partial<MemberDGroupRow> = {}): MemberDGroupRow {
  return {
    id: 'user-1',
    memberId: 'RFID-1',
    fullName: 'Test Alice Leader',
    role: 'Prayer Coach',
    avatarObjectKey: null,
    hasDGroup: true,
    dgroupLeader: null,
    dgroupStatus: 'Leader',
    dgroupMemberSince: '2023',
    isDGroupLeader: true,
    ...overrides,
  };
}

describe('MemberDGroupSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobileViewport.mockReturnValue(false);
  });

  const sampleAnalytics: MemberDGroupAnalytics = {
    totalMembers: 3,
    inDGroupCount: 2,
    missingDGroupCount: 1,
    coveragePercentage: 66.7,
    dgroupLeaderCount: 1,
    dgroupMemberCount: 1,
    statusBreakdown: [
      { status: 'Leader', count: 1, percentage: 50 },
      { status: 'Member', count: 1, percentage: 50 },
    ],
    members: [
      createMemberRow({
        id: 'user-1',
        memberId: 'RFID-1',
        fullName: 'Test Alice Leader',
        role: 'Prayer Coach',
        isDGroupLeader: true,
        dgroupStatus: 'Leader',
        hasDGroup: true,
      }),
      createMemberRow({
        id: 'user-2',
        memberId: 'RFID-2',
        fullName: 'Test Bob Disciple',
        role: 'Usher',
        isDGroupLeader: false,
        dgroupLeader: 'Test Alice Leader',
        dgroupStatus: 'Member',
        hasDGroup: true,
      }),
      createMemberRow({
        id: 'user-3',
        memberId: 'RFID-3',
        fullName: 'Test Charlie Unconnected',
        role: 'Volunteer',
        isDGroupLeader: false,
        dgroupLeader: null,
        dgroupStatus: null,
        dgroupMemberSince: null,
        hasDGroup: false,
      }),
    ],
  };

  it('renders all members in desktop table by default', () => {
    render(
      <MemoryRouter>
        <MemberDGroupSection analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    expect(screen.getByText('DGroup Directory & Member Records')).toBeInTheDocument();
    expect(screen.getAllByText('Test Alice Leader').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Test Bob Disciple')).toBeInTheDocument();
    expect(screen.getByText('Test Charlie Unconnected')).toBeInTheDocument();
  });

  it('filters by status tabs', () => {
    render(
      <MemoryRouter>
        <MemberDGroupSection analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    // Click 'Leaders (1)'
    fireEvent.click(screen.getByRole('button', { name: /Leaders/i }));
    expect(screen.getByText('Test Alice Leader')).toBeInTheDocument();
    expect(screen.queryByText('Test Bob Disciple')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Charlie Unconnected')).not.toBeInTheDocument();

    // Click 'Members (1)'
    fireEvent.click(screen.getByRole('button', { name: /Members \(1\)/i }));
    expect(screen.getByText('Test Bob Disciple')).toBeInTheDocument();
    expect(screen.queryByText('Test Charlie Unconnected')).not.toBeInTheDocument();

    // Click 'No DGroup (1)'
    fireEvent.click(screen.getByRole('button', { name: /No DGroup/i }));
    expect(screen.getByText('Test Charlie Unconnected')).toBeInTheDocument();
    expect(screen.queryByText('Test Bob Disciple')).not.toBeInTheDocument();

    // Click 'In DGroup (2)'
    fireEvent.click(screen.getByRole('button', { name: /In DGroup/i }));
    expect(screen.getAllByText('Test Alice Leader').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Test Bob Disciple')).toBeInTheDocument();
    expect(screen.queryByText('Test Charlie Unconnected')).not.toBeInTheDocument();
  });

  it('filters by search input and handles empty results', () => {
    render(
      <MemoryRouter>
        <MemberDGroupSection analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search member, leader, or status...');
    fireEvent.change(searchInput, { target: { value: 'bob' } });

    expect(screen.getByText('Test Bob Disciple')).toBeInTheDocument();

    // Search something with zero results
    fireEvent.change(searchInput, { target: { value: 'nonexistent-person' } });
    expect(screen.getByText(/No members found matching your search criteria/i)).toBeInTheDocument();
  });

  it('handles empty member list with empty state', () => {
    const emptyAnalytics: MemberDGroupAnalytics = {
      totalMembers: 0,
      inDGroupCount: 0,
      missingDGroupCount: 0,
      coveragePercentage: 0,
      dgroupLeaderCount: 0,
      dgroupMemberCount: 0,
      statusBreakdown: [],
      members: [],
    };

    render(
      <MemoryRouter>
        <MemberDGroupSection analytics={emptyAnalytics} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No members found in this view/i)).toBeInTheDocument();
  });

  it('renders mobile cards in mobile viewport', () => {
    mockUseIsMobileViewport.mockReturnValue(true);

    render(
      <MemoryRouter>
        <MemberDGroupSection analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link', { name: /View Member Profile/i })).toHaveLength(3);
    expect(screen.getAllByText('Test Alice Leader').length).toBeGreaterThanOrEqual(1);
  });

  it('paginates correctly when there are more than 25 members', () => {
    const manyMembers: MemberDGroupRow[] = Array.from({ length: 30 }, (_, i) =>
      createMemberRow({
        id: `user-${i + 1}`,
        memberId: `RFID-${i + 1}`,
        fullName: `Test Member ${i + 1}`,
        role: 'Volunteer',
      }),
    );

    const paginatedAnalytics: MemberDGroupAnalytics = {
      ...sampleAnalytics,
      totalMembers: 30,
      inDGroupCount: 30,
      members: manyMembers,
    };

    render(
      <MemoryRouter>
        <MemberDGroupSection analytics={paginatedAnalytics} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Test Member 1')).toBeInTheDocument();
    expect(screen.getByText('Test Member 25')).toBeInTheDocument();
    expect(screen.queryByText('Test Member 26')).not.toBeInTheDocument();

    // Click Next
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Test Member 26')).toBeInTheDocument();
    expect(screen.getByText('Test Member 30')).toBeInTheDocument();
    expect(screen.queryByText('Test Member 1')).not.toBeInTheDocument();

    // Click Previous
    fireEvent.click(screen.getByRole('button', { name: /Previous/i }));
    expect(screen.getByText('Test Member 1')).toBeInTheDocument();
  });
});
