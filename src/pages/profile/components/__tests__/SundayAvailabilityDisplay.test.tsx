import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SundayAvailabilityDisplay } from '../SundayAvailabilityDisplay';

describe('SundayAvailabilityDisplay', () => {
  it('renders correctly even when no sunday availability is configured', () => {
    render(<SundayAvailabilityDisplay metadata={{ is_oic: 'true' }} />);
    expect(screen.getByText('First Sunday')).toBeInTheDocument();

    // Everything should be unchecked
    const firstSunday9AM = screen.getByRole('switch', { name: 'First Sunday at 9AM availability' });
    expect(firstSunday9AM).not.toBeChecked();
  });

  it('renders disabled switches with correct values', () => {
    render(
      <SundayAvailabilityDisplay
        metadata={{
          first_sunday: '9AM, 12NN',
          second_sunday: '3PM',
        }}
      />,
    );

    const firstSunday9AM = screen.getByRole('switch', { name: 'First Sunday at 9AM availability' });
    expect(firstSunday9AM).toBeChecked();
    expect(firstSunday9AM).toBeDisabled();

    const firstSunday3PM = screen.getByRole('switch', { name: 'First Sunday at 3PM availability' });
    expect(firstSunday3PM).not.toBeChecked();
    expect(firstSunday3PM).toBeDisabled();

    const secondSunday3PM = screen.getByRole('switch', {
      name: 'Second Sunday at 3PM availability',
    });
    expect(secondSunday3PM).toBeChecked();
    expect(secondSunday3PM).toBeDisabled();
  });
});
