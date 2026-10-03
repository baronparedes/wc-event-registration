import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SlotConfidenceForecastBanner } from '../SlotConfidenceForecastBanner';
import type { SlotConfidenceForecast } from '../hubCalendarForecastUtils';

describe('SlotConfidenceForecastBanner', () => {
  it('returns null when totalCommitted is 0', () => {
    const emptyForecast: SlotConfidenceForecast = {
      totalCommitted: 0,
      expectedTurnup: 0,
      confidencePercentage: 0,
      highCount: 0,
      moderateCount: 0,
      atRiskCount: 0,
      excusedCount: 0,
    };

    const { container } = render(<SlotConfidenceForecastBanner forecast={emptyForecast} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders expected turnup, confidence badge, and reliability breakdown badges', () => {
    const forecast: SlotConfidenceForecast = {
      totalCommitted: 82,
      expectedTurnup: 48,
      confidencePercentage: 59,
      highCount: 30,
      moderateCount: 27,
      atRiskCount: 22,
      excusedCount: 3,
    };

    render(<SlotConfidenceForecastBanner forecast={forecast} />);

    expect(screen.getByText(/~48 \/ 82/i)).toBeInTheDocument();
    expect(screen.getByText(/59% confidence/i)).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Solid')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText('At Risk')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Excused')).toBeInTheDocument();
  });
});
