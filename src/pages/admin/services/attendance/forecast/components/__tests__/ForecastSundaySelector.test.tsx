import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SundayForecastData } from '@/pages/admin/services/attendance/forecast/hooks/useAttendanceForecastData';

import { ForecastSundaySelector } from '../ForecastSundaySelector';

describe('ForecastSundaySelector', () => {
  const mockSundays = [
    {
      date: new Date(2026, 9, 4),
      dayNumber: 4,
      isoDateKey: '2026-10-04',
      sundayKey: 'first_sunday',
      ordinalLabel: '1st Sunday',
      formattedDate: 'October 4, 2026',
    },
    {
      date: new Date(2026, 9, 11),
      dayNumber: 11,
      isoDateKey: '2026-10-11',
      sundayKey: 'second_sunday',
      ordinalLabel: '2nd Sunday',
      formattedDate: 'October 11, 2026',
    },
  ] as unknown as SundayForecastData[];

  it('renders All Sundays tab and formatted individual Sunday tabs', () => {
    const onChange = vi.fn();
    render(
      <ForecastSundaySelector
        sundays={mockSundays}
        activeSundayKey="ALL"
        onChangeSunday={onChange}
      />,
    );

    const allTab = screen.getByRole('tab', { name: /All Sundays/i });
    expect(allTab).toBeInTheDocument();
    expect(allTab).toHaveAttribute('aria-selected', 'true');

    expect(screen.getByRole('tab', { name: /1st Sunday \(Oct 4\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /2nd Sunday \(Oct 11\)/i })).toBeInTheDocument();
  });

  it('calls onChangeSunday when clicking a Sunday tab', () => {
    const onChange = vi.fn();
    render(
      <ForecastSundaySelector
        sundays={mockSundays}
        activeSundayKey="ALL"
        onChangeSunday={onChange}
      />,
    );

    const firstSundayTab = screen.getByRole('tab', { name: /1st Sunday \(Oct 4\)/i });
    fireEvent.click(firstSundayTab);

    expect(onChange).toHaveBeenCalledWith('2026-10-04');
  });
});
