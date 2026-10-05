import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { DateFieldRenderer, DatetimeFieldRenderer } from '@/components/fields/DateFieldRenderer';
import type { DynamicFieldLike } from '@/lib/domain/dynamic-fields';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';

function TestHarness({
  field,
  Component,
  defaultValue = '',
}: {
  field: DynamicFieldLike;
  Component: typeof DateFieldRenderer | typeof DatetimeFieldRenderer;
  defaultValue?: string;
}) {
  const form = useForm<DynamicFieldResponseValues>({
    defaultValues: { [field.field_key]: defaultValue },
  });

  return <Component field={field} dynamicForm={form} />;
}

describe('DateFieldRenderer & DatetimeFieldRenderer', () => {
  const dateField: DynamicFieldLike = {
    id: 'field-date-1',
    field_key: 'attendance_date',
    label: 'Select Date',
    field_type: 'date',
    is_required: false,
    validation_rules: {
      min_date: '2026-01-01',
      max_date: '2026-12-31',
      max_past_days: 14,
      allowed_weekdays: [0, 6],
    },
  };

  it('renders date picker button and opens day picker on click', () => {
    render(<TestHarness field={dateField} Component={DateFieldRenderer} />);

    const button = screen.getByRole('button', { name: /Select date/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(document.querySelector('.rdp-root')).toBeInTheDocument();

    // Select a day in DayPicker
    const dayButton = document.querySelector('.rdp-day_button');
    if (dayButton) {
      fireEvent.click(dayButton);
    }
  });

  it('renders datetime picker with time input and updates on change', () => {
    render(
      <TestHarness
        field={{ ...dateField, field_type: 'datetime' }}
        Component={DatetimeFieldRenderer}
        defaultValue="2026-10-05T09:30"
      />,
    );

    const button = screen.getByRole('button', { name: /2026-10-05/i });
    expect(button).toBeInTheDocument();

    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
    expect(timeInput).toBeInTheDocument();
    expect(timeInput.value).toBe('09:30');

    fireEvent.change(timeInput, { target: { value: '11:00' } });
    expect(timeInput.value).toBe('11:00');

    fireEvent.click(button);
    const dayButton = document.querySelector('.rdp-day_button');
    if (dayButton) {
      fireEvent.click(dayButton);
    }
  });

  it('renders pre-populated date value in trigger button', () => {
    render(
      <TestHarness field={dateField} Component={DateFieldRenderer} defaultValue="2026-10-05" />,
    );

    expect(screen.getByRole('button', { name: /2026-10-05/i })).toBeInTheDocument();
  });
});
