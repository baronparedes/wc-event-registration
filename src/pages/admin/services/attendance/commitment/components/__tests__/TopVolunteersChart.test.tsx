import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CommitmentDashboardStat } from '@/hooks/domain/services';

import { TopVolunteersChart } from '../TopVolunteersChart';

vi.mock('recharts', async () => {
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    BarChart: ({
      children,
      data,
    }: {
      children: React.ReactNode;
      data: Array<{ name: string; score: number; fullName: string }>;
    }) => (
      <div data-testid="bar-chart" data-items={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Bar: () => <div data-testid="bar" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
    Tooltip: ({
      content,
    }: {
      content: (props: {
        active?: boolean;
        payload?: Array<{ payload: { fullName: string; score: number } }>;
      }) => React.ReactNode;
    }) => (
      <div data-testid="tooltip">
        {content({
          active: true,
          payload: [{ payload: { fullName: 'Test Alpha', score: 10 } }],
        })}
        {content({
          active: false,
          payload: [],
        })}
      </div>
    ),
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
  };
});

describe('TopVolunteersChart', () => {
  const mockStats: CommitmentDashboardStat[] = [
    {
      user_id: '1',
      member_id: 'MEM-001',
      avatar_object_key: null,
      full_name: 'Test Alpha',
      nickname: 'Test Ali',
      email: 'test.alpha@example.com',
      role: 'Usher',
      category: 'Women',
      start_date: '2025-01-01',
      committed: 10,
      attended: 8,
      absences: 2,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      wi_5th_sunday: 0,
      attendance_score: 6,
    },
    {
      user_id: '2',
      member_id: 'MEM-002',
      avatar_object_key: null,
      full_name: 'Test Bravo',
      nickname: '',
      email: 'test.bravo@example.com',
      role: 'Greeter',
      category: 'Men',
      start_date: '2025-02-01',
      committed: 10,
      attended: 10,
      absences: 0,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      wi_5th_sunday: 0,
      attendance_score: 10,
    },
  ];

  it('renders top volunteers chart when stats are provided', () => {
    render(<TopVolunteersChart stats={mockStats} />);

    expect(screen.getByText('Top 15 Volunteers by Attendance')).toBeInTheDocument();
    expect(
      screen.getByText('Ranked by cumulative attendance score in the active timeframe'),
    ).toBeInTheDocument();

    const chart = screen.getByTestId('bar-chart');
    const items = JSON.parse(chart.getAttribute('data-items') || '[]');
    expect(items).toHaveLength(2);
    // Test Bravo should be first (score 10), Test Alpha second (score 6)
    expect(items[0].fullName).toBe('Test Bravo');
    expect(items[0].name).toBe('Test'); // derived from full_name when nickname is empty
    expect(items[1].fullName).toBe('Test Alpha');
    expect(items[1].name).toBe('Test Ali'); // nickname

    expect(screen.getByText('Test Alpha')).toBeInTheDocument();
  });

  it('returns null when stats array is empty', () => {
    const { container } = render(<TopVolunteersChart stats={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
