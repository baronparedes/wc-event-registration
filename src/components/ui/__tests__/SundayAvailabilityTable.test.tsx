import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SundayAvailabilityTable } from '../SundayAvailabilityTable';
import type { SundayTimeSlot } from '../sundayAvailabilityConstants';

describe('SundayAvailabilityTable', () => {
  it('renders all weeks and time slots', () => {
    render(<SundayAvailabilityTable value={{}} />);

    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('9 AM')).toBeInTheDocument();
    expect(screen.getByText('12 NN')).toBeInTheDocument();
    expect(screen.getByText('3 PM')).toBeInTheDocument();

    expect(screen.getByText('First Sunday')).toBeInTheDocument();
    expect(screen.getByText('Second Sunday')).toBeInTheDocument();
    expect(screen.getByText('Third Sunday')).toBeInTheDocument();
    expect(screen.getByText('Fourth Sunday')).toBeInTheDocument();
    expect(screen.getByText('Fifth Sunday')).toBeInTheDocument();
  });

  it('reflects checked switches from array values', () => {
    render(
      <SundayAvailabilityTable
        value={{
          first_sunday: ['9AM', '12NN'],
          third_sunday: ['3PM'],
        }}
      />,
    );

    const firstSun9am = screen.getByRole('switch', {
      name: 'Toggle First Sunday at 9AM',
    });
    const firstSun12nn = screen.getByRole('switch', {
      name: 'Toggle First Sunday at 12NN',
    });
    const firstSun3pm = screen.getByRole('switch', {
      name: 'Toggle First Sunday at 3PM',
    });
    const thirdSun3pm = screen.getByRole('switch', {
      name: 'Toggle Third Sunday at 3PM',
    });

    expect(firstSun9am).toBeChecked();
    expect(firstSun12nn).toBeChecked();
    expect(firstSun3pm).not.toBeChecked();
    expect(thirdSun3pm).toBeChecked();
  });

  it('reflects checked switches from Set values', () => {
    render(
      <SundayAvailabilityTable
        value={{
          second_sunday: new Set<SundayTimeSlot>(['12NN']),
        }}
      />,
    );

    const secondSun12nn = screen.getByRole('switch', {
      name: 'Toggle Second Sunday at 12NN',
    });
    const secondSun9am = screen.getByRole('switch', {
      name: 'Toggle Second Sunday at 9AM',
    });

    expect(secondSun12nn).toBeChecked();
    expect(secondSun9am).not.toBeChecked();
  });

  it('calls onChange when switch is toggled in interactive mode', () => {
    const onChange = vi.fn();
    render(
      <SundayAvailabilityTable
        value={{
          first_sunday: ['9AM'],
        }}
        onChange={onChange}
      />,
    );

    const firstSun12nn = screen.getByRole('switch', {
      name: 'Toggle First Sunday at 12NN',
    });
    fireEvent.click(firstSun12nn);

    expect(onChange).toHaveBeenCalledWith('first_sunday', '12NN', true);
  });

  it('disables switches when readOnly or disabled is true', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SundayAvailabilityTable value={{ first_sunday: ['9AM'] }} onChange={onChange} readOnly />,
    );

    const switchEl = screen.getByRole('switch', {
      name: 'Toggle First Sunday at 9AM',
    });
    expect(switchEl).toBeDisabled();

    fireEvent.click(switchEl);
    expect(onChange).not.toHaveBeenCalled();

    rerender(
      <SundayAvailabilityTable value={{ first_sunday: ['9AM'] }} onChange={onChange} disabled />,
    );
    expect(switchEl).toBeDisabled();
  });
});
