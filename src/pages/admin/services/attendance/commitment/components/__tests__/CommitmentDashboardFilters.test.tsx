import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CommitmentDashboardFilters, type DashboardTimeframe } from '../CommitmentDashboardFilters';

describe('CommitmentDashboardFilters', () => {
  it('renders all timeframe tabs and displays YTD description', () => {
    const onTimeframeChange = vi.fn();
    render(
      <CommitmentDashboardFilters
        timeframe="YTD"
        onTimeframeChange={onTimeframeChange}
        year={2026}
      />,
    );

    expect(screen.getByRole('tab', { name: /YTD/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Q1/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Q2/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Q3/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Q4/i })).toBeInTheDocument();

    expect(
      screen.getByText('YTD includes Q1, Q2, Q3, and Q4 aggregate attendance metrics.'),
    ).toBeInTheDocument();
  });

  it('displays quarter-specific description when a quarter timeframe is selected', () => {
    const onTimeframeChange = vi.fn();
    render(
      <CommitmentDashboardFilters
        timeframe="Q2"
        onTimeframeChange={onTimeframeChange}
        year={2026}
      />,
    );

    expect(
      screen.getByText('Q2 includes data for the selected quarter in 2026.'),
    ).toBeInTheDocument();
  });

  it('triggers onTimeframeChange callback when a tab is clicked', () => {
    const onTimeframeChange = vi.fn();
    render(
      <CommitmentDashboardFilters
        timeframe="YTD"
        onTimeframeChange={onTimeframeChange}
        year={2026}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: /Q3/i }));
    expect(onTimeframeChange).toHaveBeenCalledWith('Q3' as DashboardTimeframe);
  });
});
