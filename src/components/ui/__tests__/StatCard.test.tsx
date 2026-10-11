import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatCard } from '../StatCard';

describe('StatCard', () => {
  it('renders title, value, and subtitle correctly', () => {
    render(
      <StatCard title="Total Volunteers" value={42} subtitle="active members" variant="primary" />,
    );

    expect(screen.getByText('Total Volunteers')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('active members')).toBeInTheDocument();
  });

  it('renders optional icon and header action', () => {
    render(
      <StatCard
        title="Metric"
        value="100%"
        icon={<span data-testid="icon">★</span>}
        headerAction={<button type="button">Info</button>}
      />,
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Info' })).toBeInTheDocument();
  });

  it('renders children within the card body', () => {
    render(
      <StatCard title="With Children" value={10}>
        <div data-testid="extra-content">Extra note</div>
      </StatCard>,
    );

    expect(screen.getByTestId('extra-content')).toHaveTextContent('Extra note');
  });
});
