import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields';
import {
  MultiSelectFieldRenderer,
  MultiSelectToggleFieldRenderer,
  RadioFieldRenderer,
  SelectFieldRenderer,
} from '@/pages/events/[slug]/register/components/field-renderers/SelectFieldRenderer';

type RendererHarnessProps = {
  field: PublicEventField;
  renderer: 'select' | 'radio' | 'multi' | 'toggle';
  defaultValues?: DynamicFieldResponseValues;
};

function createField(overrides: Partial<PublicEventField>): PublicEventField {
  return {
    id: 'field-1',
    event_id: 'event-1',
    field_key: 'meal_choice',
    label: 'Meal Choice',
    field_type: 'select',
    is_required: false,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [
      { value: 'veg', label: 'Vegetarian' },
      { value: 'nonveg', label: 'Non-Vegetarian' },
    ],
    validation_rules: {},
    display_order: 0,
    ...overrides,
  };
}

function Harness({ field, renderer, defaultValues }: RendererHarnessProps) {
  const dynamicForm = useForm<DynamicFieldResponseValues>({
    defaultValues: defaultValues ?? {},
  });

  if (renderer === 'radio') {
    return <RadioFieldRenderer field={field} dynamicForm={dynamicForm} />;
  }

  if (renderer === 'multi') {
    return <MultiSelectFieldRenderer field={field} dynamicForm={dynamicForm} />;
  }

  if (renderer === 'toggle') {
    return <MultiSelectToggleFieldRenderer field={field} dynamicForm={dynamicForm} />;
  }

  return <SelectFieldRenderer field={field} dynamicForm={dynamicForm} />;
}

describe('SelectFieldRenderer family', () => {
  it('renders a select with default and configured options', () => {
    const field = createField({ field_key: 'food' });

    render(<Harness field={field} renderer="select" />);

    expect(screen.getByRole('option', { name: 'Select an option' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Vegetarian' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Non-Vegetarian' })).toBeInTheDocument();
  });

  it('renders radio and multi-select option controls', () => {
    const radioField = createField({ field_key: 'shirt_size', field_type: 'radio' });
    const multiField = createField({ field_key: 'activities', field_type: 'multi_select' });

    const { rerender } = render(<Harness field={radioField} renderer="radio" />);
    expect(screen.getByLabelText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByLabelText('Non-Vegetarian')).toBeInTheDocument();

    rerender(<Harness field={multiField} renderer="multi" />);
    expect(screen.getByLabelText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByLabelText('Non-Vegetarian')).toBeInTheDocument();
  });

  it('handles multi-select-toggle interaction, pending choice states, and fallback toggle label', () => {
    const toggleField = createField({
      field_key: 'meal_slots',
      field_type: 'multi_select_toggle',
      options: [
        { value: 'breakfast', label: 'Breakfast Slot' },
        {
          value: 'lunch',
          label: 'Lunch Slot',
          toggle_label: 'With meal?',
          toggle_default: true,
        },
      ],
    });

    render(
      <Harness
        field={toggleField}
        renderer="toggle"
        defaultValues={{ meal_slots: 'invalid-raw-value' as unknown as DynamicFieldResponseValues }}
      />,
    );

    expect(screen.getByText('Snack?')).toBeInTheDocument();
    expect(screen.getByText('With meal?')).toBeInTheDocument();

    const breakfastCheckbox = screen.getByLabelText('Breakfast Slot');
    const breakfastYes = screen.getByRole('button', { name: 'Breakfast Slot - Yes' });
    const breakfastNo = screen.getByRole('button', { name: 'Breakfast Slot - No' });
    const lunchCheckbox = screen.getByLabelText('Lunch Slot');
    const lunchYes = screen.getByRole('button', { name: 'Lunch Slot - Yes' });

    expect(breakfastYes).toBeDisabled();
    expect(breakfastNo).toBeDisabled();

    fireEvent.click(breakfastCheckbox);

    expect(breakfastYes).toBeEnabled();
    expect(breakfastNo).toBeEnabled();
    expect(screen.getByText('Choose Yes or No to continue.')).toBeInTheDocument();
    expect(breakfastYes.className).not.toContain('border-4 border-primary');
    expect(breakfastNo.className).not.toContain('border-4 border-primary');

    fireEvent.click(breakfastNo);
    expect(breakfastNo.className).toContain('border-4 border-primary');
    expect(screen.queryByText('Choose Yes or No to continue.')).not.toBeInTheDocument();

    fireEvent.click(lunchCheckbox);
    expect(lunchYes.className).toContain('border-4 border-primary');

    fireEvent.click(breakfastCheckbox);
    expect(breakfastYes).toBeDisabled();
  });
});
