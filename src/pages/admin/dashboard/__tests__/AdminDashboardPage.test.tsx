import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { AdminMember } from '@/lib/domain/members';

import { AdminDashboardPage } from '../index';

const {
  mockUseAdminMembersSchedulesQuery,
  mockUseAdminMembersMilestonesQuery,
  mockUseIsMobileViewport,
} = vi.hoisted(() => ({
  mockUseAdminMembersSchedulesQuery: vi.fn(),
  mockUseAdminMembersMilestonesQuery: vi.fn(),
  mockUseIsMobileViewport: vi.fn(),
}));

vi.mock('@/hooks/domain/members', () => ({
  useAdminMembersSchedulesQuery: () => mockUseAdminMembersSchedulesQuery(),
  useAdminMembersMilestonesQuery: () => mockUseAdminMembersMilestonesQuery(),
  useMemberAvatarQuery: () => ({ data: null }),
}));

vi.mock('@/hooks/utils', () => ({
  useIsMobileViewport: () => mockUseIsMobileViewport(),
}));

const now = new Date();
const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');

const sampleMember: AdminMember = {
  id: 'm1',
  member_id: 'MEM-001',
  avatar_object_key: null,
  is_active: true,
  first_name: 'John',
  last_name: 'Doe',
  nickname: 'Johnny',
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '123-456',
  date_of_birth: `1990-${currentMonthStr}-15`,
  role: 'Usher',
  category: 'adult',
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
  extra_metadata: {
    wedding_anniversary_date: `2015-${currentMonthStr}-20`,
  },
};

const sampleSchedule: MemberScheduleEntry = {
  member: sampleMember,
  sundayKey: 'first_sunday',
  timeSlots: ['9AM', '12NN'],
};

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobileViewport.mockReturnValue(false);
  });

  it('renders loading state and error state correctly', () => {
    mockUseAdminMembersSchedulesQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    });
    mockUseAdminMembersMilestonesQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: null,
    });

    renderComponent();
    expect(screen.getByText('Loading calendar data...')).toBeInTheDocument();

    mockUseAdminMembersSchedulesQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load schedules'),
    });
    mockUseAdminMembersMilestonesQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: null,
    });

    renderComponent();
    expect(
      screen.getByText('Failed to load calendar schedules and milestones. Please refresh.'),
    ).toBeInTheDocument();
  });

  it('renders Hub Calendar header and milestone month stats bar', () => {
    mockUseAdminMembersSchedulesQuery.mockReturnValue({
      data: [sampleSchedule],
      isLoading: false,
      error: null,
    });
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [sampleMember],
      isLoading: false,
      error: null,
    });

    renderComponent();
    expect(screen.getAllByText('Hub Calendar').length).toBeGreaterThan(0);
    expect(screen.getByText('Birthdays this month')).toBeInTheDocument();
    expect(screen.getByText('Wedding Anniversaries')).toBeInTheDocument();
    expect(screen.getByText('Export Month Milestones CSV')).toBeInTheDocument();
  });

  it('allows month navigation and Today button click', () => {
    mockUseAdminMembersSchedulesQuery.mockReturnValue({
      data: [sampleSchedule],
      isLoading: false,
      error: null,
    });
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [sampleMember],
      isLoading: false,
      error: null,
    });

    renderComponent();

    const nextMonthButton = screen.getByLabelText('Next month');
    fireEvent.click(nextMonthButton);

    const prevMonthButton = screen.getByLabelText('Previous month');
    fireEvent.click(prevMonthButton);

    const todayButton = screen.getByRole('button', { name: 'Today' });
    if (!todayButton.hasAttribute('disabled')) {
      fireEvent.click(todayButton);
    }
  });

  it('renders time slot tabs and role filters for scheduled Sunday', () => {
    mockUseAdminMembersSchedulesQuery.mockReturnValue({
      data: [
        sampleSchedule,
        {
          member: { ...sampleMember, id: 'm2', full_name: 'Jane Smith', role: 'Greeter' },
          sundayKey: 'first_sunday',
          timeSlots: ['9AM'],
        },
      ],
      isLoading: false,
      error: null,
    });
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [sampleMember],
      isLoading: false,
      error: null,
    });

    renderComponent();

    // Find the first Sunday in the current month
    const now = new Date();
    let firstSunday = 1;
    while (new Date(now.getFullYear(), now.getMonth(), firstSunday).getDay() !== 0) {
      firstSunday++;
    }

    const dayButtons = screen.getAllByRole('button');
    const sundayBtn = dayButtons.find((btn) => btn.textContent?.includes(String(firstSunday)));
    if (sundayBtn) {
      fireEvent.click(sundayBtn);
    }

    // Select tab 12NN
    const tab12nn = screen.getByRole('button', { name: /12:00 NN/i });
    fireEvent.click(tab12nn);

    // Select tab 3PM
    const tab3pm = screen.getByRole('button', { name: /3:00 PM/i });
    fireEvent.click(tab3pm);

    // Switch back to 9AM
    const tab9am = screen.getByRole('button', { name: /9:00 AM/i });
    fireEvent.click(tab9am);

    // Role filter
    const roleFilter = screen.getByRole('button', { name: 'Usher' });
    fireEvent.click(roleFilter);
    // Toggle role filter off
    fireEvent.click(roleFilter);

    const allFilter = screen.getByRole('button', { name: 'All' });
    fireEvent.click(allFilter);

    // Click member card
    const memberCard = screen.getByText('John Doe');
    fireEvent.click(memberCard);

    // Click second Sunday (which has no schedules)
    const secondSunday = firstSunday + 7;
    const secondSundayBtn = dayButtons.find((btn) =>
      btn.textContent?.includes(String(secondSunday)),
    );
    if (secondSundayBtn) {
      fireEvent.click(secondSundayBtn);
      expect(screen.getByText('No schedules on this Sunday')).toBeInTheDocument();
    }
  });

  it('displays selected date details for Sundays and weekdays with milestones', () => {
    mockUseAdminMembersSchedulesQuery.mockReturnValue({
      data: [sampleSchedule],
      isLoading: false,
      error: null,
    });
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [sampleMember],
      isLoading: false,
      error: null,
    });

    renderComponent();

    const dayButtons = screen.getAllByRole('button');
    const day15Button = dayButtons.find((btn) => btn.textContent?.includes('15'));
    if (day15Button) {
      fireEvent.click(day15Button);
    }

    expect(screen.getByText('Selected Date Details')).toBeInTheDocument();
    expect(screen.getByText('Birthdays & Wedding Anniversaries')).toBeInTheDocument();

    const birthdayBadge = screen.getByText('Birthday');
    fireEvent.click(birthdayBadge);
  });

  it('renders in mobile viewport and allows selecting weeks', () => {
    mockUseIsMobileViewport.mockReturnValue(true);
    mockUseAdminMembersSchedulesQuery.mockReturnValue({
      data: [sampleSchedule],
      isLoading: false,
      error: null,
    });
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [sampleMember],
      isLoading: false,
      error: null,
    });

    renderComponent();

    const week2Btn = screen.queryByLabelText('Go to week 2');
    if (week2Btn && !week2Btn.hasAttribute('disabled')) {
      fireEvent.click(week2Btn);
    }
  });
});
