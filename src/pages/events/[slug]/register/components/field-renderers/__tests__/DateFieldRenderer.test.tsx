import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm, useWatch } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields';
import {
  DateFieldRenderer,
  DatetimeFieldRenderer,
} from '@/pages/events/[slug]/register/components/field-renderers/DateFieldRenderer';

vi.mock('react-day-picker', () => ({
  DayPicker: ({ onSelect }: { onSelect?: (value?: Date) => void }) => (
    <div>
      <button type="button" onClick={() => onSelect?.(new Date(2026, 6, 14))}>
        pick tuesday
      </button>
      <button type="button" onClick={() => onSelect?.()}>
        clear selection
      </button>
    </div>
  ),
}));

vi.mock('react-day-picker/style.css', () => ({}));

function makeField(overrides: Partial<PublicEventField> = {}): PublicEventField {
  return {
    id: 'field-1',
    event_id: 'event-1',
    field_key: 'service_date',
    label: 'Service Date',
    field_type: 'date',
    is_required: true,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 0,
    ...overrides,
  };
}

function DateRendererHarness({ field }: { field: PublicEventField }) {
  const dynamicForm = useForm<DynamicFieldResponseValues>({
    defaultValues: {
      [field.field_key]: '',
    },
    mode: 'onChange',
  });
  const watchedValue = useWatch({
    control: dynamicForm.control,
    name: field.field_key,
  });

  return (
    <form>
      <DateFieldRenderer field={field} dynamicForm={dynamicForm} />
      <button
        type="button"
        onClick={async () => {
          await dynamicForm.trigger(field.field_key);
        }}
      >
        validate
      </button>
      <output data-testid="value">{String(watchedValue ?? '')}</output>
      <output data-testid="error">
        {dynamicForm.formState.errors[field.field_key]?.message as string}
      </output>
    </form>
  );
}

function DatetimeRendererHarness({ field }: { field: PublicEventField }) {
  const dynamicForm = useForm<DynamicFieldResponseValues>({
    defaultValues: {
      [field.field_key]: '',
    },
    mode: 'onChange',
  });
  const watchedValue = useWatch({
    control: dynamicForm.control,
    name: field.field_key,
  });

  return (
    <form>
      <DatetimeFieldRenderer field={field} dynamicForm={dynamicForm} />
      <button
        type="button"
        onClick={async () => {
          await dynamicForm.trigger(field.field_key);
        }}
      >
        validate
      </button>
      <output data-testid="value">{String(watchedValue ?? '')}</output>
      <output data-testid="error">
        {dynamicForm.formState.errors[field.field_key]?.message as string}
      </output>
    </form>
  );
}

describe('DateFieldRenderer', () => {
  it('opens picker and writes selected date value', () => {
    render(<DateRendererHarness field={makeField()} />);

    fireEvent.click(screen.getByRole('button', { name: /select date/i }));
    fireEvent.click(screen.getByRole('button', { name: /pick tuesday/i }));

    expect(screen.getByTestId('value')).toHaveTextContent('2026-07-14');
  });

  it('keeps picker open when selection is cleared', () => {
    render(<DateRendererHarness field={makeField()} />);

    fireEvent.click(screen.getByRole('button', { name: /select date/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear selection/i }));

    expect(screen.getByRole('button', { name: /pick tuesday/i })).toBeInTheDocument();
  });

  it('shows weekday validation error when chosen day is outside allowed weekdays', async () => {
    render(
      <DateRendererHarness
        field={makeField({
          validation_rules: { allowed_weekdays: [4] },
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /select date/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pick tuesday/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /pick tuesday/i }));
      fireEvent.click(screen.getByRole('button', { name: /validate/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Please select a valid date for Thursday.',
      );
    });
  });

  it('accepts selected date when weekday is allowed', async () => {
    render(
      <DateRendererHarness
        field={makeField({
          validation_rules: { allowed_weekdays: [2, 4] },
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /select date/i }));
    fireEvent.click(screen.getByRole('button', { name: /pick tuesday/i }));
    fireEvent.click(screen.getByRole('button', { name: /validate/i }));

    expect(screen.getByTestId('error')).toHaveTextContent('');
    expect(screen.getByTestId('value')).toHaveTextContent('2026-07-14');
  });

  it('does not emit weekday validation errors for empty values', async () => {
    render(
      <DateRendererHarness
        field={makeField({
          validation_rules: { allowed_weekdays: [2, 4] },
        })}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /validate/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('');
    });
  });

  it('renders with max_past_days validation rule configured', () => {
    render(
      <DateRendererHarness
        field={makeField({
          validation_rules: { max_past_days: 3 },
        })}
      />,
    );

    expect(screen.getByRole('button', { name: /select date/i })).toBeInTheDocument();
  });
});

describe('DatetimeFieldRenderer', () => {
  it('starts with disabled time input until date is selected', () => {
    render(
      <DatetimeRendererHarness
        field={makeField({ field_type: 'datetime', field_key: 'service_time' })}
      />,
    );

    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement | null;
    expect(timeInput).not.toBeNull();
    expect(timeInput).toBeDisabled();
  });

  it('combines selected date and typed time into datetime value', () => {
    render(
      <DatetimeRendererHarness
        field={makeField({ field_type: 'datetime', field_key: 'service_time' })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /select date/i }));
    fireEvent.click(screen.getByRole('button', { name: /pick tuesday/i }));

    const timeInput = screen.getByDisplayValue('00:00');
    fireEvent.change(timeInput, { target: { value: '13:45' } });

    expect(screen.getByTestId('value')).toHaveTextContent('2026-07-14T13:45');
  });

  it('keeps picker visible when datetime selection is cleared', async () => {
    render(
      <DatetimeRendererHarness
        field={makeField({ field_type: 'datetime', field_key: 'service_time' })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /select date/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /clear selection/i }));

    expect(screen.getByRole('button', { name: /pick tuesday/i })).toBeInTheDocument();
  });

  it('enforces weekday validation for datetime values', async () => {
    render(
      <DatetimeRendererHarness
        field={makeField({
          field_type: 'datetime',
          field_key: 'service_time',
          validation_rules: { allowed_weekdays: [4] },
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /select date/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pick tuesday/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /pick tuesday/i }));

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Please select a valid date for Thursday.',
      );
    });
  });
});
