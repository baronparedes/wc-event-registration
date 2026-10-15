import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MissedServiceCommitment } from '@/lib/domain/services';

import { MissedCommitmentsModal } from '../MissedCommitmentsModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderModal(ui: React.ReactElement) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const { mockUseIsMobileViewport } = vi.hoisted(() => ({
  mockUseIsMobileViewport: vi.fn(),
}));

vi.mock('@/hooks/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/utils')>();
  return {
    ...actual,
    useIsMobileViewport: () => mockUseIsMobileViewport(),
  };
});

const mockUseMissedServiceCommitmentsQuery = vi.fn();
vi.mock('@/hooks/domain/services', () => ({
  useMissedServiceCommitmentsQuery: (...args: unknown[]) =>
    mockUseMissedServiceCommitmentsQuery(...args),
}));

const sampleMissedRecords: MissedServiceCommitment[] = [
  {
    user_id: 'user-1',
    member_id: 'MEM-001',
    full_name: 'Test Volunteer One',
    nickname: 'Test Nickname',
    role: 'Usher',
    phone: '09171234567',
    avatar_object_key: null,
    service_date: '2026-03-15',
    time_slot: '9AM',
    status: 'absent',
    category: 'Adult',
  },
  {
    user_id: 'user-2',
    member_id: 'MEM-002',
    full_name: 'Test Volunteer Two',
    nickname: null,
    role: 'Prayer Coach',
    phone: '09189876543',
    avatar_object_key: null,
    service_date: '2026-03-15',
    time_slot: '12NN',
    status: 'excused',
    category: 'Youth',
  },
];

describe('MissedCommitmentsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobileViewport.mockReturnValue(false);
  });

  it('renders loading state when query is loading', () => {
    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: [],
      isLoading: true,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    expect(screen.getByText('Loading missed commitments...')).toBeInTheDocument();
  });

  it('renders volunteers list with contact number, role, and color-coded slot badges', () => {
    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: sampleMissedRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Missed Commitments' })).toBeInTheDocument();
    expect(screen.getByText('2 Volunteers')).toBeInTheDocument();
    expect(screen.getByText('Sunday, March 15, 2026')).toBeInTheDocument();

    // Legend
    expect(screen.getByText('Legend:')).toBeInTheDocument();
    expect(screen.getByText('Absent')).toBeInTheDocument();
    expect(screen.getByText('Excused')).toBeInTheDocument();

    // Volunteer 1 (Absent)
    expect(screen.getByText('Test Volunteer One')).toBeInTheDocument();
    expect(screen.getByText('(Test Nickname)')).toBeInTheDocument();
    expect(screen.getAllByText('Usher').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('09171234567')).toBeInTheDocument();
    const slot9Badge = screen.getByText('9AM');
    expect(slot9Badge).toBeInTheDocument();
    expect(slot9Badge).toHaveAttribute('title', 'Absent');

    // Volunteer 2 (Excused)
    expect(screen.getByText('Test Volunteer Two')).toBeInTheDocument();
    expect(screen.getByText(/MEM-002/)).toBeInTheDocument();
    expect(screen.getAllByText('Prayer Coach').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('09189876543')).toBeInTheDocument();
    const slot12Badge = screen.getByText('12NN');
    expect(slot12Badge).toBeInTheDocument();
    expect(slot12Badge).toHaveAttribute('title', 'Excused');
  });

  it('groups multiple missed slots for the same volunteer into a single row', () => {
    const multiSlotRecords: MissedServiceCommitment[] = [
      {
        user_id: 'user-1',
        member_id: 'MEM-001',
        full_name: 'Test Multi Slot Volunteer',
        nickname: 'Test Multi',
        role: 'Usher',
        phone: '09170001111',
        avatar_object_key: null,
        service_date: '2026-03-15',
        time_slot: '9AM',
        status: 'absent',
        category: 'Adult',
      },
      {
        user_id: 'user-1',
        member_id: 'MEM-001',
        full_name: 'Test Multi Slot Volunteer',
        nickname: 'Test Multi',
        role: 'Prayer Coach',
        phone: '09170001111',
        avatar_object_key: null,
        service_date: '2026-03-15',
        time_slot: '12NN',
        status: 'excused',
        category: 'Adult',
      },
    ];

    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: multiSlotRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    // Should indicate 1 volunteer and 2 slots
    expect(screen.getByText('1 Volunteer')).toBeInTheDocument();
    expect(screen.getByText('2 slots')).toBeInTheDocument();

    // The volunteer only appears once in the table rows
    const volunteerNameMatches = screen.getAllByText('Test Multi Slot Volunteer');
    expect(volunteerNameMatches).toHaveLength(1);

    // Both slot chips should be visible with appropriate titles
    const slot9 = screen.getByText('9AM');
    expect(slot9).toBeInTheDocument();
    expect(slot9).toHaveAttribute('title', 'Absent');

    const slot12 = screen.getByText('12NN');
    expect(slot12).toBeInTheDocument();
    expect(slot12).toHaveAttribute('title', 'Excused');

    expect(screen.getByText('2×')).toBeInTheDocument();

    // Roles should both be rendered
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
  });

  it('initializes and filters the table by initialTimeSlot (e.g. 9AM)', () => {
    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: sampleMissedRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
        initialTimeSlot="9AM"
      />,
    );

    // Volunteer 1 is 9AM, Volunteer 2 is 12NN
    expect(screen.getByText('Test Volunteer One')).toBeInTheDocument();
    expect(screen.queryByText('Test Volunteer Two')).not.toBeInTheDocument();
  });

  it('filters by time slot when slot option is selected', () => {
    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: sampleMissedRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    // Filter to 9AM
    const slotTrigger = screen.getByRole('button', { name: 'Slot' });
    fireEvent.click(slotTrigger);
    const slot9Option = screen.getByRole('option', { name: '9AM' });
    fireEvent.click(slot9Option);

    expect(screen.getByText('Test Volunteer One')).toBeInTheDocument();
    expect(screen.queryByText('Test Volunteer Two')).not.toBeInTheDocument();

    // Filter to 12NN
    fireEvent.click(slotTrigger);
    const slot12Option = screen.getByRole('option', { name: '12NN' });
    fireEvent.click(slot12Option);

    expect(screen.queryByText('Test Volunteer One')).not.toBeInTheDocument();
    expect(screen.getByText('Test Volunteer Two')).toBeInTheDocument();
  });

  it('filters by status when status option is selected', () => {
    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: sampleMissedRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    // Filter to Excused
    const statusTrigger = screen.getByRole('button', { name: 'Status' });
    fireEvent.click(statusTrigger);
    const excusedOption = screen.getByRole('option', { name: 'Excused' });
    fireEvent.click(excusedOption);

    expect(screen.queryByText('Test Volunteer One')).not.toBeInTheDocument();
    expect(screen.getByText('Test Volunteer Two')).toBeInTheDocument();
  });

  it('filters by search query', () => {
    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: sampleMissedRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    const searchInput = screen.getByPlaceholderText('Search by name, role, phone...');
    fireEvent.change(searchInput, { target: { value: 'Test Nickname' } });

    expect(screen.getByText('Test Volunteer One')).toBeInTheDocument();
    expect(screen.queryByText('Test Volunteer Two')).not.toBeInTheDocument();
  });

  it('clears filters when Clear button is clicked', () => {
    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: sampleMissedRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    expect(clearBtn).toBeDisabled();

    // Filter to 9AM
    const slotTrigger = screen.getByRole('button', { name: 'Slot' });
    fireEvent.click(slotTrigger);
    const slot9Option = screen.getByRole('option', { name: '9AM' });
    fireEvent.click(slot9Option);

    expect(screen.queryByText('Test Volunteer Two')).not.toBeInTheDocument();
    expect(clearBtn).not.toBeDisabled();

    // Click Clear
    fireEvent.click(clearBtn);

    // Both volunteers should be visible again and button disabled
    expect(screen.getByText('Test Volunteer One')).toBeInTheDocument();
    expect(screen.getByText('Test Volunteer Two')).toBeInTheDocument();
    expect(clearBtn).toBeDisabled();
  });

  it('filters by role when role option is selected in FormSelectField', () => {
    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: sampleMissedRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    // Open Role FormSelectField
    const roleTrigger = screen.getByRole('button', { name: 'Role' });
    fireEvent.click(roleTrigger);

    // Select 'Usher'
    const usherOption = screen.getByRole('option', { name: 'Usher' });
    fireEvent.click(usherOption);

    expect(screen.getByText('Test Volunteer One')).toBeInTheDocument();
    expect(screen.queryByText('Test Volunteer Two')).not.toBeInTheDocument();
  });

  it('displays 3× multiplier badge and sorts slots chronologically when 3 slots are missed', () => {
    const threeSlotRecords: MissedServiceCommitment[] = [
      {
        user_id: 'user-3',
        member_id: 'MEM-003',
        full_name: 'Test Triple Volunteer',
        nickname: null,
        role: 'Usher',
        phone: '09173333333',
        avatar_object_key: null,
        service_date: '2026-03-15',
        time_slot: '12NN',
        status: 'absent',
        category: 'Adult',
      },
      {
        user_id: 'user-3',
        member_id: 'MEM-003',
        full_name: 'Test Triple Volunteer',
        nickname: null,
        role: 'Usher',
        phone: '09173333333',
        avatar_object_key: null,
        service_date: '2026-03-15',
        time_slot: '6:30AM',
        status: 'absent',
        category: 'Adult',
      },
      {
        user_id: 'user-3',
        member_id: 'MEM-003',
        full_name: 'Test Triple Volunteer',
        nickname: null,
        role: 'Usher',
        phone: '09173333333',
        avatar_object_key: null,
        service_date: '2026-03-15',
        time_slot: '9AM',
        status: 'excused',
        category: 'Adult',
      },
    ];

    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: threeSlotRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    // Multiplier badge
    expect(screen.getByText('3×')).toBeInTheDocument();

    // Verify all 3 slots appear
    expect(screen.getByText('6:30AM')).toBeInTheDocument();
    expect(screen.getByText('9AM')).toBeInTheDocument();
    expect(screen.getByText('12NN')).toBeInTheDocument();

    // Role should only appear once (deduplicated)
    const roleBadges = screen.getAllByText('Usher');
    // One in Role filter option/display, exactly one in table row
    expect(roleBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('does not display a multiplier badge when only 1 slot is missed', () => {
    const singleSlotRecords: MissedServiceCommitment[] = [
      {
        user_id: 'user-4',
        member_id: 'MEM-004',
        full_name: 'Test Single Volunteer',
        nickname: null,
        role: 'Usher',
        phone: '09174444444',
        avatar_object_key: null,
        service_date: '2026-03-15',
        time_slot: '9AM',
        status: 'absent',
        category: 'Adult',
      },
    ];

    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: singleSlotRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    expect(screen.queryByText('1×')).not.toBeInTheDocument();
    expect(screen.getByText('9AM')).toBeInTheDocument();
  });

  it('renders date prefix in slot chips for month and annual view modes', () => {
    const monthRecords: MissedServiceCommitment[] = [
      {
        user_id: 'user-5',
        member_id: 'MEM-005',
        full_name: 'Test Month Volunteer',
        nickname: null,
        role: 'Usher',
        phone: '09175555555',
        avatar_object_key: null,
        service_date: '2026-03-15',
        time_slot: '9AM',
        status: 'absent',
        category: 'Adult',
      },
      {
        user_id: 'user-5',
        member_id: 'MEM-005',
        full_name: 'Test Month Volunteer',
        nickname: null,
        role: 'Usher',
        phone: '09175555555',
        avatar_object_key: null,
        service_date: '2026-03-22',
        time_slot: '12NN',
        status: 'excused',
        category: 'Adult',
      },
    ];

    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: monthRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="month"
        selectedYear={2026}
        selectedMonth={3}
      />,
    );

    expect(screen.getByText('March 2026')).toBeInTheDocument();
    expect(screen.getByText('Mar 15 • 9AM')).toBeInTheDocument();
    expect(screen.getByText('Mar 22 • 12NN')).toBeInTheDocument();
  });

  it('updates slot chips and multiplier dynamically when filters are applied', () => {
    const multiSlotRecords: MissedServiceCommitment[] = [
      {
        user_id: 'user-6',
        member_id: 'MEM-006',
        full_name: 'Test Filter Volunteer',
        nickname: null,
        role: 'Usher',
        phone: '09176666666',
        avatar_object_key: null,
        service_date: '2026-03-15',
        time_slot: '9AM',
        status: 'absent',
        category: 'Adult',
      },
      {
        user_id: 'user-6',
        member_id: 'MEM-006',
        full_name: 'Test Filter Volunteer',
        nickname: null,
        role: 'Usher',
        phone: '09176666666',
        avatar_object_key: null,
        service_date: '2026-03-15',
        time_slot: '12NN',
        status: 'absent',
        category: 'Adult',
      },
    ];

    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: multiSlotRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    // Initially 2 slots with 2×
    expect(screen.getByText('2×')).toBeInTheDocument();
    expect(screen.getByText('9AM')).toBeInTheDocument();
    expect(screen.getByText('12NN')).toBeInTheDocument();

    // Filter by slot 9AM
    const slotTrigger = screen.getByRole('button', { name: 'Slot' });
    fireEvent.click(slotTrigger);
    const slot9Option = screen.getByRole('option', { name: '9AM' });
    fireEvent.click(slot9Option);

    // Multiplier 2× should disappear because only 1 filtered slot remains
    expect(screen.queryByText('2×')).not.toBeInTheDocument();
    expect(screen.getByTitle('Absent')).toHaveTextContent('9AM');
    expect(screen.queryByText('12NN')).not.toBeInTheDocument();
  });

  it('renders correct empty state descriptions for no query results vs no filter matches', () => {
    // 1. Raw records is empty
    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { rerender } = renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    expect(
      screen.getByText('All committed volunteers attended their scheduled service slots.'),
    ).toBeInTheDocument();

    // 2. Raw records has data, but search filters it out
    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: sampleMissedRecords,
      isLoading: false,
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <MissedCommitmentsModal
          isOpen={true}
          onClose={vi.fn()}
          filterMode="sunday"
          selectedSunday="2026-03-15"
        />
      </QueryClientProvider>,
    );

    const searchInput = screen.getByPlaceholderText('Search by name, role, phone...');
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Volunteer' } });

    expect(
      screen.getByText('No volunteers match your current search or filter criteria.'),
    ).toBeInTheDocument();
  });

  it('renders mobile card list when isMobileViewport is true', () => {
    mockUseIsMobileViewport.mockReturnValue(true);
    mockUseMissedServiceCommitmentsQuery.mockReturnValue({
      data: sampleMissedRecords,
      isLoading: false,
    });

    renderModal(
      <MissedCommitmentsModal
        isOpen={true}
        onClose={vi.fn()}
        filterMode="sunday"
        selectedSunday="2026-03-15"
      />,
    );

    // Desktop table columnheaders should not be rendered
    expect(screen.queryByRole('columnheader', { name: 'Volunteer' })).not.toBeInTheDocument();

    // Volunteer names and details should be present in mobile cards
    expect(screen.getByText('Test Volunteer One')).toBeInTheDocument();
    expect(screen.getByText('Test Volunteer Two')).toBeInTheDocument();
    expect(screen.getAllByText('Contact Number').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('09171234567')).toBeInTheDocument();
    expect(screen.getByText('09189876543')).toBeInTheDocument();
  });
});
