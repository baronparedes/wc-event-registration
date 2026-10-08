import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SlotConfidenceForecast } from '@/pages/admin/hub-calendar/utils';

import { SlotConfidenceForecastBanner } from '../SlotConfidenceForecastBanner';

describe('SlotConfidenceForecastBanner', () => {
  it('returns null when totalCommitted is 0', () => {
    const emptyForecast: SlotConfidenceForecast = {
      totalCommitted: 0,
      expectedTurnup: 0,
      confidencePercentage: 0,
      highCount: 0,
      moderateCount: 0,
      atRiskCount: 0,
      inactiveCount: 0,
      excusedCount: 0,
    };

    const { container } = render(<SlotConfidenceForecastBanner forecast={emptyForecast} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders expected turnup, confidence badge, and reliability breakdown badges', () => {
    const forecast: SlotConfidenceForecast = {
      totalCommitted: 85,
      expectedTurnup: 48,
      confidencePercentage: 56,
      highCount: 30,
      moderateCount: 27,
      atRiskCount: 22,
      inactiveCount: 4,
      excusedCount: 2,
    };

    render(<SlotConfidenceForecastBanner forecast={forecast} />);

    expect(screen.getByText(/~48 \/ 85/i)).toBeInTheDocument();
    expect(screen.getByText(/56% confidence/i)).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Solid')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText('At Risk')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Excused')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onSelectTier when clicking on tier buttons', () => {
    const forecast: SlotConfidenceForecast = {
      totalCommitted: 85,
      expectedTurnup: 48,
      confidencePercentage: 56,
      highCount: 30,
      moderateCount: 27,
      atRiskCount: 22,
      inactiveCount: 4,
      excusedCount: 2,
    };
    const handleSelectTier = vi.fn();

    const { rerender } = render(
      <SlotConfidenceForecastBanner
        forecast={forecast}
        selectedTier={null}
        onSelectTier={handleSelectTier}
      />,
    );

    const solidBtn = screen.getByRole('button', { name: /Solid/i });
    fireEvent.click(solidBtn);
    expect(handleSelectTier).toHaveBeenCalledWith('solid');

    const inactiveBtn = screen.getByRole('button', { name: /Inactive/i });
    fireEvent.click(inactiveBtn);
    expect(handleSelectTier).toHaveBeenCalledWith('inactive');

    rerender(
      <SlotConfidenceForecastBanner
        forecast={forecast}
        selectedTier="solid"
        onSelectTier={handleSelectTier}
      />,
    );

    // Clicking solid again should toggle off (pass null)
    fireEvent.click(solidBtn);
    expect(handleSelectTier).toHaveBeenCalledWith(null);
  });
});
