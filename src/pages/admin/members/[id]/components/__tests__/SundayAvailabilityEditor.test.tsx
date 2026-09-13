import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { SundayAvailabilityEditor } from '../SundayAvailabilityEditor';

function TestWrapper({
  initialEntries = [],
  disabled = false,
}: {
  initialEntries?: { key: string; value: string }[];
  disabled?: boolean;
}) {
  const { control, setValue } = useForm({
    defaultValues: { metadata_entries: initialEntries },
  });

  return (
    <SundayAvailabilityEditor
      control={
        control as unknown as React.ComponentProps<typeof SundayAvailabilityEditor>['control']
      }
      setValue={
        setValue as unknown as React.ComponentProps<typeof SundayAvailabilityEditor>['setValue']
      }
      disabled={disabled}
    />
  );
}

describe('SundayAvailabilityEditor', () => {
  it('renders the editor with all sunday keys and timeslots', () => {
    render(<TestWrapper />);

    expect(screen.getByText('First Sunday')).toBeInTheDocument();
    expect(screen.getByText('1st Sun')).toBeInTheDocument();
    expect(screen.getByText('Fifth Sunday')).toBeInTheDocument();
    expect(screen.getByText('5th Sun')).toBeInTheDocument();
    expect(screen.getAllByText('9 AM').length).toBeGreaterThan(0);
  });

  it('initializes toggles correctly based on metadata', () => {
    render(
      <TestWrapper
        initialEntries={[
          { key: 'first_sunday', value: '9AM, 12NN' },
          { key: 'second_sunday', value: '3PM' },
        ]}
      />,
    );

    const firstSunday9AM = screen.getByRole('switch', { name: 'Toggle First Sunday at 9AM' });
    expect(firstSunday9AM).toBeChecked();

    const firstSunday3PM = screen.getByRole('switch', { name: 'Toggle First Sunday at 3PM' });
    expect(firstSunday3PM).not.toBeChecked();

    const secondSunday3PM = screen.getByRole('switch', { name: 'Toggle Second Sunday at 3PM' });
    expect(secondSunday3PM).toBeChecked();

    // Badge showing 2 slots selected for First Sunday
    expect(screen.getByLabelText('2 slots selected')).toBeInTheDocument();
  });

  it('toggles a time slot on and off', () => {
    render(<TestWrapper initialEntries={[{ key: 'first_sunday', value: '9AM' }]} />);

    const switch3PM = screen.getByRole('switch', { name: 'Toggle First Sunday at 3PM' });
    expect(switch3PM).not.toBeChecked();

    fireEvent.click(switch3PM);

    const switch9AM = screen.getByRole('switch', { name: 'Toggle First Sunday at 9AM' });
    fireEvent.click(switch9AM);
  });

  it('handles disabled state', () => {
    render(<TestWrapper disabled={true} />);

    const switchControl = screen.getByRole('switch', { name: 'Toggle First Sunday at 9AM' });
    expect(switchControl).toBeDisabled();
  });
});
