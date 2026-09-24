import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCommitmentDashboardStatsQuery } from '@/hooks/domain/services';

import { AdminServiceAttendanceCommitmentPage } from '../index';

vi.mock('@/hooks/domain/services', () => ({
  useCommitmentDashboardStatsQuery: vi.fn(),
  useExportCommitmentDashboardStatsCSVMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('../components/TopVolunteersChart', () => ({
  TopVolunteersChart: () => <div data-testid="top-volunteers-chart" />,
}));

let latestObserverCallback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null;

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    latestObserverCallback = callback;
  }
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

describe('AdminServiceAttendanceCommitmentPage', () => {
  const queryClient = new QueryClient();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  const mockQueryReturnValue = {
    data: {
      pages: [
        {
          items: [
            {
              user_id: '1',
              member_id: 'MEM-001',
              avatar_object_key: null,
              full_name: 'John Doe',
              nickname: 'Johnny',
              email: 'john@example.com',
              role: 'Usher',
              category: 'Men',
              start_date: '2025-01-01',
              committed: 10,
              attended: 8,
              absences: 2,
              excused: 0,
              wi_9am_3pm: 0,
              wi_12nn: 0,
              attendance_score: 6,
            },
          ],
          totalCount: 1,
        },
      ],
    },
    isLoading: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCommitmentDashboardStatsQuery).mockReturnValue(
      mockQueryReturnValue as unknown as ReturnType<typeof useCommitmentDashboardStatsQuery>,
    );
  });

  it('renders correctly with stats', () => {
    render(<AdminServiceAttendanceCommitmentPage />, { wrapper });

    expect(screen.getAllByText('Commitment Dashboard')[0]).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Volunteers')).toBeInTheDocument();
  });

  it('handles timeframe switching across quarters (Q1, Q2, Q3, Q4)', () => {
    render(<AdminServiceAttendanceCommitmentPage />, { wrapper });

    const q1Tab = screen.getByRole('tab', { name: /Q1/i });
    fireEvent.click(q1Tab);
    expect(useCommitmentDashboardStatsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        start_date: expect.stringMatching(/-\d{2}-01$/),
        end_date: expect.stringMatching(/-\d{2}-31$/),
      }),
    );

    const q2Tab = screen.getByRole('tab', { name: /Q2/i });
    fireEvent.click(q2Tab);

    const q3Tab = screen.getByRole('tab', { name: /Q3/i });
    fireEvent.click(q3Tab);

    const q4Tab = screen.getByRole('tab', { name: /Q4/i });
    fireEvent.click(q4Tab);
  });

  it('handles search input with debounced query update', () => {
    vi.useFakeTimers();
    render(<AdminServiceAttendanceCommitmentPage />, { wrapper });

    const searchInput = screen.getByLabelText('Search name or nickname');
    fireEvent.change(searchInput, { target: { value: 'Johnny' } });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(useCommitmentDashboardStatsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        search_query: 'Johnny',
      }),
    );

    vi.useRealTimers();
  });

  it('handles role filter multi-select change', () => {
    render(<AdminServiceAttendanceCommitmentPage />, { wrapper });

    const roleDropdownTrigger = screen.getByLabelText('Filter by Role');
    fireEvent.click(roleDropdownTrigger);

    const usherCheckbox = screen.getByRole('checkbox', { name: /usher/i });
    fireEvent.click(usherCheckbox);

    expect(useCommitmentDashboardStatsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'Usher',
      }),
    );
  });

  it('handles category filter selection change', () => {
    render(<AdminServiceAttendanceCommitmentPage />, { wrapper });

    const categoryBtn = screen.getByLabelText('Filter by Category');
    fireEvent.click(categoryBtn);

    const option = screen.getByRole('option', { name: 'Men' });
    fireEvent.click(option);

    expect(useCommitmentDashboardStatsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'Men',
      }),
    );
  });

  it('handles multiple roles selection joined as comma separated string', () => {
    render(<AdminServiceAttendanceCommitmentPage />, { wrapper });

    const roleDropdownTrigger = screen.getByLabelText('Filter by Role');
    fireEvent.click(roleDropdownTrigger);

    const usherCheckbox = screen.getByRole('checkbox', { name: /usher/i });
    fireEvent.click(usherCheckbox);

    const oicCheckbox = screen.getByRole('checkbox', { name: /oic/i });
    fireEvent.click(oicCheckbox);

    expect(useCommitmentDashboardStatsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'Usher,OIC',
      }),
    );
  });

  it('triggers fetchNextPage when intersection observer observes bottom and hasNextPage is true', () => {
    const fetchNextPageMock = vi.fn();

    vi.mocked(useCommitmentDashboardStatsQuery).mockReturnValue({
      ...mockQueryReturnValue,
      hasNextPage: true,
      fetchNextPage: fetchNextPageMock,
    } as unknown as ReturnType<typeof useCommitmentDashboardStatsQuery>);

    render(<AdminServiceAttendanceCommitmentPage />, { wrapper });

    act(() => {
      if (latestObserverCallback) {
        latestObserverCallback([{ isIntersecting: true }]);
      }
    });

    expect(fetchNextPageMock).toHaveBeenCalledTimes(1);
  });

  it('handles empty stats and loading state', () => {
    vi.mocked(useCommitmentDashboardStatsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
    } as unknown as ReturnType<typeof useCommitmentDashboardStatsQuery>);

    render(<AdminServiceAttendanceCommitmentPage />, { wrapper });

    expect(screen.getByText('0 with activity')).toBeInTheDocument();
  });

  it('renders Export as CSV button in header actions', () => {
    render(<AdminServiceAttendanceCommitmentPage />, { wrapper });

    expect(
      screen.getByRole('button', { name: 'Export commitment dashboard as CSV' }),
    ).toBeInTheDocument();
  });
});
