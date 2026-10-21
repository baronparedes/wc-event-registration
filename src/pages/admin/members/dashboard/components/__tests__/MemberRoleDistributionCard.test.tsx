import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MemberRoleStat } from '@/lib/domain/members';

import { MemberRoleDistributionCard } from '../MemberRoleDistributionCard';

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
              fullName: 'Test Very Long Role Name For Truncation',
              count: 12,
              percentage: 60,
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

describe('MemberRoleDistributionCard', () => {
  const sampleRoles: MemberRoleStat[] = [
    { role: 'Volunteer', count: 10, percentage: 50 },
    { role: 'Prayer Coach', count: 5, percentage: 25 },
    { role: 'Usher', count: 3, percentage: 15 },
    { role: 'Backroom Support', count: 2, percentage: 10 },
  ];

  it('renders nothing when roles array is empty', () => {
    const { container } = render(<MemberRoleDistributionCard roles={[]} totalMembers={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders roles and breakdown badge', () => {
    render(<MemberRoleDistributionCard roles={sampleRoles} totalMembers={20} />);

    expect(screen.getByText('Primary Role Distributions')).toBeInTheDocument();
    expect(
      screen.getByText('Breakdown of active member primary roles across 20 members'),
    ).toBeInTheDocument();
    expect(screen.getByText('Volunteer')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
    expect(screen.getByText('10 (50%)')).toBeInTheDocument();

    // Tooltip executed
    expect(screen.getByText('Test Very Long Role Name For Truncation')).toBeInTheDocument();
  });

  it('renders Show All toggle button when roles exceed 8 and toggles view', () => {
    const manyRoles: MemberRoleStat[] = Array.from({ length: 10 }, (_, i) => ({
      role: `Role ${i + 1}`,
      count: 10 - i,
      percentage: 10,
    }));

    render(<MemberRoleDistributionCard roles={manyRoles} totalMembers={55} />);

    const toggleButton = screen.getByRole('button', { name: /Show All \(10\)/i });
    expect(toggleButton).toBeInTheDocument();

    // In initial view, role 9 and 10 are not in the displayed list
    expect(screen.queryByText('Role 9')).not.toBeInTheDocument();

    // Click Show All
    fireEvent.click(toggleButton);
    expect(screen.getByRole('button', { name: /Show Top 8/i })).toBeInTheDocument();
    expect(screen.getByText('Role 9')).toBeInTheDocument();
    expect(screen.getByText('Role 10')).toBeInTheDocument();

    // Click Show Top 8
    fireEvent.click(screen.getByRole('button', { name: /Show Top 8/i }));
    expect(screen.queryByText('Role 9')).not.toBeInTheDocument();
  });
});
