import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MemberAgeDemographics } from '@/lib/domain/members';

import { MemberAgeDemographicsCard } from '../MemberAgeDemographicsCard';

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
  Tooltip: ({
    content,
  }: {
    content?: (props: { active?: boolean; payload?: unknown[] }) => React.ReactNode;
  }) => (
    <div data-testid="tooltip">
      {content?.({
        active: true,
        payload: [
          {
            payload: {
              bracket: '25–34',
              count: 10,
              percentage: 45.5,
              color: 'var(--color-primary)',
            },
          },
        ],
      })}
      {content?.({ active: false })}
    </div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));

describe('MemberAgeDemographicsCard', () => {
  const sampleDemographics: MemberAgeDemographics = {
    totalWithDob: 15,
    totalMembers: 20,
    averageAge: 32.4,
    medianAge: 30,
    coveragePercentage: 75,
    brackets: [
      { bracket: '< 18', count: 1, percentage: 5 },
      { bracket: '18–24', count: 3, percentage: 15 },
      { bracket: '25–34', count: 6, percentage: 30 },
      { bracket: '35–44', count: 3, percentage: 15 },
      { bracket: '45–54', count: 2, percentage: 10 },
      { bracket: '55–64', count: 0, percentage: 0 },
      { bracket: '65+', count: 0, percentage: 0 },
      { bracket: 'Unspecified', count: 5, percentage: 25 },
    ],
  };

  it('renders demographics statistics, average and median age badges', () => {
    render(<MemberAgeDemographicsCard demographics={sampleDemographics} />);

    expect(screen.getByText('Age Demographics')).toBeInTheDocument();
    expect(screen.getByText(/Recorded for 15 of 20 members/i)).toBeInTheDocument();
    expect(screen.getByText(/32.4 yrs/i)).toBeInTheDocument();
    expect(screen.getByText(/30 yrs/i)).toBeInTheDocument();

    // Tooltip custom renderer executed
    expect(screen.getByText(/Age Group: 25–34/i)).toBeInTheDocument();
  });

  it('renders fallback subtitle when totalWithDob is 0 and hides age badges', () => {
    const emptyDemographics: MemberAgeDemographics = {
      totalWithDob: 0,
      totalMembers: 5,
      averageAge: null,
      medianAge: null,
      coveragePercentage: 0,
      brackets: [
        { bracket: '< 18', count: 0, percentage: 0 },
        { bracket: 'Unspecified', count: 5, percentage: 100 },
      ],
    };

    render(<MemberAgeDemographicsCard demographics={emptyDemographics} />);

    expect(screen.getByText('Birth dates not recorded yet')).toBeInTheDocument();
    expect(screen.queryByText(/Avg:/i)).not.toBeInTheDocument();
  });
});
