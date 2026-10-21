import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MemberDashboardData } from '@/lib/domain/members';

import { AdminMembersDashboardPage } from '../index';

const { mockUseAdminAuthQuery, mockUseAdminMembersDashboardQuery, mockUseIsMobileViewport } =
  vi.hoisted(() => ({
    mockUseAdminAuthQuery: vi.fn(),
    mockUseAdminMembersDashboardQuery: vi.fn(),
    mockUseIsMobileViewport: vi.fn(),
  }));

vi.mock('recharts', async () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="xaxis" />,
  YAxis: () => <div data-testid="yaxis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

vi.mock('@/hooks/domain/auth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/auth')>('@/hooks/domain/auth');
  return {
    ...actual,
    useAdminAuthQuery: (...args: unknown[]) => mockUseAdminAuthQuery(...args),
  };
});

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members');
  return {
    ...actual,
    useAdminMembersDashboardQuery: () => mockUseAdminMembersDashboardQuery(),
  };
});

vi.mock('@/hooks/utils', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/utils')>('@/hooks/utils');
  return {
    ...actual,
    useIsMobileViewport: () => mockUseIsMobileViewport(),
  };
});

const mockDashboardData: MemberDashboardData = {
  totalActiveMembers: 3,
  roleDistributions: [
    { role: 'Volunteer', count: 2, percentage: 66.7 },
    { role: 'DGroup Leader', count: 1, percentage: 33.3 },
  ],
  ageDemographics: {
    totalWithDob: 2,
    totalMembers: 3,
    averageAge: 32.5,
    medianAge: 32.5,
    coveragePercentage: 66.7,
    brackets: [
      { bracket: '< 18', count: 0, percentage: 0 },
      { bracket: '18–24', count: 1, percentage: 33.3 },
      { bracket: '25–34', count: 0, percentage: 0 },
      { bracket: '35–44', count: 1, percentage: 33.3 },
      { bracket: '45–54', count: 0, percentage: 0 },
      { bracket: '55–64', count: 0, percentage: 0 },
      { bracket: '65+', count: 0, percentage: 0 },
      { bracket: 'Unspecified', count: 1, percentage: 33.3 },
    ],
  },
  commitmentHeatmap: {
    maxCount: 2,
    totalCommittedMembers: 2,
    sundays: [
      { key: 'first_sunday', label: '1st Sunday', shortLabel: '1st Sun' },
      { key: 'second_sunday', label: '2nd Sunday', shortLabel: '2nd Sun' },
      { key: 'third_sunday', label: '3rd Sunday', shortLabel: '3rd Sun' },
      { key: 'fourth_sunday', label: '4th Sunday', shortLabel: '4th Sun' },
      { key: 'fifth_sunday', label: '5th Sunday', shortLabel: '5th Sun' },
    ],
    timeSlots: [
      { key: '9AM', label: '9:00 AM' },
      { key: '12NN', label: '12:00 NN' },
      { key: '3PM', label: '3:00 PM' },
    ],
    slots: [
      {
        sundayKey: 'first_sunday',
        sundayLabel: '1st Sunday',
        timeSlot: '9AM',
        timeSlotLabel: '9:00 AM',
        count: 1,
        percentage: 50,
        members: [
          {
            id: 'm-1',
            fullName: 'Test Jane Doe',
            role: 'DGroup Leader',
            avatarObjectKey: null,
          },
        ],
      },
    ],
  },
  dgroupAnalytics: {
    totalMembers: 3,
    inDGroupCount: 2,
    missingDGroupCount: 1,
    coveragePercentage: 66.7,
    dgroupLeaderCount: 1,
    dgroupMemberCount: 1,
    statusBreakdown: [{ status: 'Active', count: 2, percentage: 100 }],
    members: [
      {
        id: 'm-1',
        memberId: 'RFID-1',
        fullName: 'Test Jane Doe',
        role: 'DGroup Leader',
        avatarObjectKey: null,
        hasDGroup: true,
        dgroupLeader: null,
        dgroupStatus: 'Active',
        dgroupMemberSince: '2022',
        isDGroupLeader: true,
      },
      {
        id: 'm-2',
        memberId: 'RFID-2',
        fullName: 'Test John Smith',
        role: 'Volunteer',
        avatarObjectKey: null,
        hasDGroup: true,
        dgroupLeader: 'Test Jane Doe',
        dgroupStatus: 'Active',
        dgroupMemberSince: '2023',
        isDGroupLeader: false,
      },
      {
        id: 'm-3',
        memberId: 'RFID-3',
        fullName: 'Test No Group Person',
        role: 'Volunteer',
        avatarObjectKey: null,
        hasDGroup: false,
        dgroupLeader: null,
        dgroupStatus: null,
        dgroupMemberSince: null,
        isDGroupLeader: false,
      },
    ],
  },
};

describe('AdminMembersDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobileViewport.mockReturnValue(false);
    mockUseAdminAuthQuery.mockReturnValue({
      data: {
        isAuthenticated: true,
        adminRole: 'super_admin',
        adminUser: { id: 'admin-1', email: 'admin@example.com' },
      },
    });
  });

  it('renders loading state initially', () => {
    mockUseAdminMembersDashboardQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    });

    render(
      <MemoryRouter>
        <AdminMembersDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Members Analytics & Dashboard')).toBeInTheDocument();
  });

  it('renders error state and handles retry', () => {
    const mockRefetch = vi.fn();
    mockUseAdminMembersDashboardQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network failure'),
      refetch: mockRefetch,
      isRefetching: false,
    });

    render(
      <MemoryRouter>
        <AdminMembersDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Failed to load member analytics')).toBeInTheDocument();
    expect(screen.getByText('Network failure')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders empty state when there are no active members', () => {
    mockUseAdminMembersDashboardQuery.mockReturnValue({
      data: {
        totalActiveMembers: 0,
        roleDistributions: [],
        ageDemographics: {
          totalWithDob: 0,
          totalMembers: 0,
          averageAge: null,
          medianAge: null,
          coveragePercentage: 0,
          brackets: [],
        },
        commitmentHeatmap: {
          maxCount: 0,
          totalCommittedMembers: 0,
          sundays: [],
          timeSlots: [],
          slots: [],
        },
        dgroupAnalytics: {
          totalMembers: 0,
          inDGroupCount: 0,
          missingDGroupCount: 0,
          coveragePercentage: 0,
          dgroupLeaderCount: 0,
          statusBreakdown: [],
          members: [],
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    });

    render(
      <MemoryRouter>
        <AdminMembersDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No active members found')).toBeInTheDocument();
  });

  it('renders full dashboard analytics, charts, heatmaps, and DGroup directory on desktop', () => {
    const mockRefetch = vi.fn();
    mockUseAdminMembersDashboardQuery.mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isRefetching: false,
    });

    render(
      <MemoryRouter>
        <AdminMembersDashboardPage />
      </MemoryRouter>,
    );

    // KPI cards
    expect(screen.getByText('Active Members')).toBeInTheDocument();
    expect(screen.getByText('DGroup Participation')).toBeInTheDocument();
    expect(screen.getByText('DGroup Leaders')).toBeInTheDocument();
    expect(screen.getByText('Sunday Volunteers')).toBeInTheDocument();
    expect(screen.getByText('Average Age')).toBeInTheDocument();
    expect(screen.getAllByText(/32\.5\s*yrs/).length).toBeGreaterThanOrEqual(1);

    // Role distributions
    expect(screen.getByText('Primary Role Distributions')).toBeInTheDocument();
    expect(screen.getAllByText('Volunteer').length).toBeGreaterThanOrEqual(1);

    // Age demographics
    expect(screen.getByText('Age Demographics')).toBeInTheDocument();

    // Sunday commitment heatmap
    expect(screen.getByText('Sunday Commitment Heatmap')).toBeInTheDocument();
    expect(screen.getByText('1st Sunday')).toBeInTheDocument();

    // DGroup Directory
    expect(screen.getByText('DGroup Directory & Member Records')).toBeInTheDocument();
    expect(screen.getAllByText('Test Jane Doe').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Test John Smith')).toBeInTheDocument();
    expect(screen.getByText('Test No Group Person')).toBeInTheDocument();

    // Filter by DGroup Leaders tab
    const leadersTab = screen.getByRole('button', { name: /leaders/i });
    fireEvent.click(leadersTab);

    expect(screen.getAllByText('Test Jane Doe').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Test John Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Test No Group Person')).not.toBeInTheDocument();

    // Refresh button
    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshBtn);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders mobile cards when in mobile viewport', () => {
    mockUseIsMobileViewport.mockReturnValue(true);
    mockUseAdminMembersDashboardQuery.mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    });

    render(
      <MemoryRouter>
        <AdminMembersDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Test Jane Doe').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('View Member Profile')[0]).toBeInTheDocument();
  });

  it('opens and closes slot attendees modal when a heatmap slot is clicked', () => {
    mockUseAdminMembersDashboardQuery.mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    });

    render(
      <MemoryRouter>
        <AdminMembersDashboardPage />
      </MemoryRouter>,
    );

    const slotButton = screen.getByTitle(/Click to view 1 volunteer/i);
    fireEvent.click(slotButton);

    expect(screen.getByText(/1st Sunday — 9:00 AM/i)).toBeInTheDocument();
    expect(screen.getByText(/1 volunteer scheduled for this service time/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /^Close$/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/1st Sunday — 9:00 AM/i)).not.toBeInTheDocument();
  });
});
