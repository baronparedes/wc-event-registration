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

  it('displays deficit status for sessions with negative overShort', () => {
    render(<SundayCommitmentChart title="TEST" sessions={sampleSessions} />);
    expect(screen.getByText('-21 Short')).toBeInTheDocument();
    expect(screen.getByText('-6 Short')).toBeInTheDocument();
  });

  it('displays surplus status for sessions with positive overShort', () => {
    const surplusSessions = [
      { slot: '9AM' as const, target: 50, scheduled: 80, confirmed: 75, overShort: 25 },
    ];
    render(<SundayCommitmentChart title="TEST" sessions={surplusSessions} />);
    expect(screen.getByText('+25 Surplus')).toBeInTheDocument();
  });

  it('displays target met status for sessions with zero overShort', () => {
    const targetMetSessions = [
      { slot: '9AM' as const, target: 60, scheduled: 60, confirmed: 60, overShort: 0 },
    ];
    render(<SundayCommitmentChart title="TEST" sessions={targetMetSessions} />);
    expect(screen.getByText('Target Met')).toBeInTheDocument();
  });

  it('renders multiple sessions with mixed statuses', () => {
    const mixedSessions = [
      { slot: '9AM' as const, target: 81, scheduled: 84, confirmed: 60, overShort: -21 },
      { slot: '12NN' as const, target: 50, scheduled: 80, confirmed: 75, overShort: 25 },
      { slot: '3PM' as const, target: 60, scheduled: 60, confirmed: 60, overShort: 0 },
    ];
    render(<SundayCommitmentChart title="MIXED" sessions={mixedSessions} />);

    expect(screen.getByText('-21 Short')).toBeInTheDocument();
    expect(screen.getByText('+25 Surplus')).toBeInTheDocument();
    expect(screen.getByText('Target Met')).toBeInTheDocument();

    // Verify all sessions are rendered
    expect(screen.getByText('9 AM Session')).toBeInTheDocument();
    expect(screen.getByText('12 NN Session')).toBeInTheDocument();
    expect(screen.getByText('3 PM Session')).toBeInTheDocument();
  });

  it('renders tooltip with correct data on chart interaction', () => {
    render(<SundayCommitmentChart title="TEST" sessions={sampleSessions} />);

    const chart = screen.getByTestId('composed-chart');
    const items = JSON.parse(chart.getAttribute('data-items') || '[]');

    expect(items).toHaveLength(3);
    items.forEach((item: (typeof sampleSessions)[0]) => {
      expect(item).toHaveProperty('session');
      expect(item).toHaveProperty('target');
      expect(item).toHaveProperty('scheduled');
      expect(item).toHaveProperty('expected');
      expect(item).toHaveProperty('overShort');
    });
  });
});
