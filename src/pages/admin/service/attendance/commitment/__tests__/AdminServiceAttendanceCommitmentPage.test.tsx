import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useCommitmentDashboardStatsQuery } from '@/hooks/domain/services';

import { AdminServiceAttendanceCommitmentPage } from '../index';

vi.mock('@/hooks/domain/services', () => ({
  useCommitmentDashboardStatsQuery: vi.fn(),
}));

vi.mock('recharts', async () => {
  const React = await import('react');
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { className: 'responsive-container' }, children),
    BarChart: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { className: 'bar-chart' }, children),
    Bar: () => React.createElement('div', { className: 'bar' }),
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    CartesianGrid: () => null,
  };
});

describe('AdminServiceAttendanceCommitmentPage', () => {
  const queryClient = new QueryClient();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  it('renders correctly with stats', () => {
    vi.mocked(useCommitmentDashboardStatsQuery).mockReturnValue({
      data: {
        pages: [
          {
            items: [
              {
                user_id: '1',
                full_name: 'John Doe',
                role: 'Usher',
                category: 'Men',
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
    } as unknown as ReturnType<typeof useCommitmentDashboardStatsQuery>);

    render(<AdminServiceAttendanceCommitmentPage />, { wrapper });

    expect(screen.getAllByText('Commitment Dashboard')[0]).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
