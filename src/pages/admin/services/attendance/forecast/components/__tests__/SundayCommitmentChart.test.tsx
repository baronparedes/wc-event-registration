import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SundayCommitmentChart } from '../SundayCommitmentChart';

vi.mock('recharts', async () => {
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    ComposedChart: ({
      children,
      data,
    }: {
      children: React.ReactNode;
      data: Array<{ session: string; target: number; scheduled: number; expected: number }>;
    }) => (
      <div data-testid="composed-chart" data-items={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Bar: () => <div data-testid="bar" />,
    Line: () => <div data-testid="line" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
  };
});

describe('SundayCommitmentChart', () => {
  const sampleSessions = [
    { slot: '9AM' as const, target: 81, scheduled: 84, confirmed: 60, overShort: -21 },
    { slot: '12NN' as const, target: 71, scheduled: 85, confirmed: 65, overShort: -6 },
    { slot: '3PM' as const, target: 91, scheduled: 83, confirmed: 58, overShort: -33 },
  ];

  it('renders chart overview title and slot breakdown cards', () => {
    render(<SundayCommitmentChart title="ALL VOLUNTEER COMMITMENTS" sessions={sampleSessions} />);

    expect(screen.getByText(/ALL VOLUNTEER COMMITMENTS — Chart Overview/i)).toBeInTheDocument();

    // 3 Slot Breakdown Cards
    expect(screen.getByText('9 AM Session')).toBeInTheDocument();
    expect(screen.getByText('-21 Short')).toBeInTheDocument();
    expect(screen.getByText('12 NN Session')).toBeInTheDocument();
    expect(screen.getByText('-6 Short')).toBeInTheDocument();
    expect(screen.getByText('3 PM Session')).toBeInTheDocument();
    expect(screen.getByText('-33 Short')).toBeInTheDocument();

    const chart = screen.getByTestId('composed-chart');
    const items = JSON.parse(chart.getAttribute('data-items') || '[]');
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({
      session: '9AM',
      target: 81,
      scheduled: 84,
      expected: 60,
      overShort: -21,
    });
  });
});
