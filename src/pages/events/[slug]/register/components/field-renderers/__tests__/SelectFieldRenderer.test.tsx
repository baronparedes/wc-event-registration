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
  memberRole?: string;
  remainingSlotsByOption?: Record<string, number>;
  remainingSlotsByRoleByOption?: Record<string, Record<string, number>>;
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

function Harness({
  field,
  renderer,
  defaultValues,
  memberRole,
  remainingSlotsByOption,
  remainingSlotsByRoleByOption,
}: RendererHarnessProps) {
  const dynamicForm = useForm<DynamicFieldResponseValues>({
    defaultValues: defaultValues ?? {},
  });

  if (renderer === 'radio') {
    return (
      <RadioFieldRenderer
        field={field}
        dynamicForm={dynamicForm}
        memberRole={memberRole}
        remainingSlotsByOption={remainingSlotsByOption}
        remainingSlotsByRoleByOption={remainingSlotsByRoleByOption}
      />
    );
  }

  if (renderer === 'multi') {
    return (
      <MultiSelectFieldRenderer
        field={field}
        dynamicForm={dynamicForm}
        memberRole={memberRole}
        remainingSlotsByOption={remainingSlotsByOption}
        remainingSlotsByRoleByOption={remainingSlotsByRoleByOption}
      />
    );
  }

  if (renderer === 'toggle') {
    return (
      <MultiSelectToggleFieldRenderer
        field={field}
        dynamicForm={dynamicForm}
        memberRole={memberRole}
        remainingSlotsByOption={remainingSlotsByOption}
        remainingSlotsByRoleByOption={remainingSlotsByRoleByOption}
      />
    );
  }

  return (
    <SelectFieldRenderer
      field={field}
      dynamicForm={dynamicForm}
      memberRole={memberRole}
      remainingSlotsByOption={remainingSlotsByOption}
      remainingSlotsByRoleByOption={remainingSlotsByRoleByOption}
    />
  );
}

describe('SelectFieldRenderer family', () => {
  it('renders a select with default and configured options', () => {
    const field = createField({ field_key: 'food' });

    render(<Harness field={field} renderer="select" />);

    expect(screen.getByRole('option', { name: 'Select an option' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Vegetarian' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Non-Vegetarian' })).toBeInTheDocument();
  });

  it('shows configured role allotment breakdown when role remaining data is unavailable', () => {
    const field = createField({
      field_key: 'meal_type',
      validation_rules: {
        max_slots: {
          veg: 10,
          nonveg: 5,
        },
        max_slots_role_allotments: {
          nonveg: [
            { role: 'Leader', alloted_slots: 2 },
            { role: 'Member', alloted_slots: 3 },
          ],
        },
      },
    });

    render(<Harness field={field} renderer="select" />);

    expect(screen.getByRole('option', { name: 'Vegetarian' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: 'Non-Vegetarian (Leader: 2 slots left, Member: 3 slots left)',
      }),
    ).toBeInTheDocument();
  });

  it('prefers remaining slot copy when remaining usage data is available', () => {
    const field = createField({
      field_key: 'meal_type_remaining',
      validation_rules: {
        max_slots: {
          veg: 10,
        },
      },
    });

    render(
      <Harness field={field} renderer="select" remainingSlotsByOption={{ veg: 3, nonveg: 2 }} />,
    );

    expect(screen.getByRole('option', { name: 'Vegetarian (3 slots left)' })).toBeInTheDocument();
  });

  it('shows role-level remaining breakdown when role allotments are configured', () => {
    const field = createField({
      field_key: 'meal_role_breakdown',
      field_type: 'radio',
      validation_rules: {
        max_slots_role_allotments: {
          nonveg: [
            { role: 'Leader', alloted_slots: 2 },
            { role: 'Member', alloted_slots: 3 },
          ],
        },
      },
    });

    render(
      <Harness
        field={field}
        renderer="radio"
        remainingSlotsByRoleByOption={{
          nonveg: {
            leader: 1,
            member: 2,
          },
        }}
      />,
    );

    expect(screen.getByText('Leader: 1 slots left, Member: 2 slots left')).toBeInTheDocument();
  });

  it('uses wildcard remaining slots for labels and does not render role breakdown text', () => {
    const field = createField({
      field_key: 'meal_wildcard_label',
      validation_rules: {
        max_slots: {
          nonveg: 4,
        },
        max_slots_role_allotments: {
          nonveg: [{ role: '*', alloted_slots: 4 }],
        },
      },
    });

    render(
      <Harness
        field={field}
        renderer="select"
        remainingSlotsByOption={{ nonveg: 1 }}
        remainingSlotsByRoleByOption={{ nonveg: { '*': 1 } }}
      />,
    );

    expect(
      screen.getByRole('option', { name: 'Non-Vegetarian (1 slots left)' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\*:/)).not.toBeInTheDocument();
  });

  it('disables wildcard option when wildcard slots are exhausted', () => {
    const field = createField({
      field_key: 'meal_wildcard_disable',
      validation_rules: {
        max_slots_role_allotments: {
          nonveg: [{ role: '*', alloted_slots: 2 }],
        },
      },
    });

    render(
      <Harness
        field={field}
        renderer="select"
        remainingSlotsByRoleByOption={{ nonveg: { '*': 0 } }}
      />,
    );

    expect(screen.getByRole('option', { name: 'Non-Vegetarian' })).toBeDisabled();
  });

  it('keeps role-allotted option enabled when member role does not match configured roles', () => {
    const field = createField({
      field_key: 'meal_role_mismatch',
      validation_rules: {
        max_slots: {
          nonveg: 1,
        },
        max_slots_role_allotments: {
          nonveg: [{ role: 'Leader', alloted_slots: 1 }],
        },
      },
    });

    render(
      <Harness
        field={field}
        renderer="select"
        memberRole="Member"
        remainingSlotsByOption={{ nonveg: 0 }}
        remainingSlotsByRoleByOption={{ nonveg: { leader: 0 } }}
      />,
    );

    expect(screen.getByRole('option', { name: /Non-Vegetarian/i })).not.toBeDisabled();
  });

  it('renders remaining slots as muted sub-label for card-style options', () => {
    const radioField = createField({
      field_key: 'meal_radio_remaining',
      field_type: 'radio',
      validation_rules: {
        max_slots: {
          veg: 10,
        },
      },
    });

    render(<Harness field={radioField} renderer="radio" remainingSlotsByOption={{ veg: 4 }} />);

    const remainingLabel = screen.getByText('4 slots left');
    expect(remainingLabel).toHaveClass('text-xs');
    expect(remainingLabel).toHaveClass('text-muted');
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
    expect(breakfastYes.className).not.toContain('border-2 border-primary');
    expect(breakfastNo.className).not.toContain('border-2 border-primary');

    fireEvent.click(breakfastNo);
    expect(breakfastNo.className).toContain('border-2 border-primary');
    expect(screen.queryByText('Choose Yes or No to continue.')).not.toBeInTheDocument();

    fireEvent.click(lunchCheckbox);
    expect(lunchYes.className).toContain('border-2 border-primary');

    fireEvent.click(breakfastCheckbox);
    expect(breakfastYes).toBeDisabled();
  });

  it('checks the toggle option when clicking the card area outside controls', () => {
    const toggleField = createField({
      field_key: 'meal_slots_card_click',
      field_type: 'multi_select_toggle',
      options: [{ value: 'breakfast', label: 'Breakfast Slot' }],
    });

    render(<Harness field={toggleField} renderer="toggle" />);

    const breakfastLabel = screen.getByText('Breakfast Slot');
    const breakfastCard = breakfastLabel.closest('[data-slot-option-card="true"]');
    const breakfastYes = screen.getByRole('button', { name: 'Breakfast Slot - Yes' });

    expect(breakfastCard).toBeTruthy();
    expect(breakfastYes).toBeDisabled();

    if (breakfastCard) {
      fireEvent.click(breakfastCard);
    }

    expect(breakfastYes).toBeEnabled();
  });

  it('does not double-toggle when clicking the option label text', () => {
    const toggleField = createField({
      field_key: 'meal_slots_label_click',
      field_type: 'multi_select_toggle',
      options: [{ value: 'breakfast', label: 'Breakfast Slot' }],
    });

    render(<Harness field={toggleField} renderer="toggle" />);

    const breakfastLabel = screen.getByText('Breakfast Slot');
    const breakfastYes = screen.getByRole('button', { name: 'Breakfast Slot - Yes' });

    expect(breakfastYes).toBeDisabled();

    fireEvent.click(breakfastLabel);
    expect(breakfastYes).toBeEnabled();

    fireEvent.click(breakfastLabel);
    expect(breakfastYes).toBeDisabled();
  });

  it('keeps selection when clicking yes/no buttons (card click handler ignored)', () => {
    const toggleField = createField({
      field_key: 'meal_slots_button_click',
      field_type: 'multi_select_toggle',
      options: [{ value: 'breakfast', label: 'Breakfast Slot' }],
    });

    render(<Harness field={toggleField} renderer="toggle" />);

    const breakfastLabel = screen.getByText('Breakfast Slot');
    const breakfastCard = breakfastLabel.closest('[data-slot-option-card="true"]');
    const breakfastYes = screen.getByRole('button', { name: 'Breakfast Slot - Yes' });

    if (breakfastCard) {
      fireEvent.click(breakfastCard);
    }

    expect(breakfastYes).toBeEnabled();

    fireEvent.click(breakfastYes);
    expect(breakfastYes).toBeEnabled();
  });

  it('renders danger styling for zero-slot totals and role breakdown in toggle metadata', () => {
    const toggleField = createField({
      field_key: 'meal_slots_zero_metadata',
      field_type: 'multi_select_toggle',
      options: [{ value: 'breakfast', label: 'Breakfast Slot' }],
      validation_rules: {
        max_slots_role_allotments: {
          breakfast: [{ role: 'Leader', alloted_slots: 1 }],
        },
      },
    });

    const { container } = render(
      <Harness
        field={toggleField}
        renderer="toggle"
        remainingSlotsByOption={{ breakfast: 0 }}
        remainingSlotsByRoleByOption={{ breakfast: { leader: 0 } }}
      />,
    );

    const totalLabel = screen.getByText('0 slots left');
    expect(totalLabel).toHaveClass('text-danger');
    expect(screen.getByText('Leader:')).toBeInTheDocument();

    const zeroCountLabel = Array.from(container.querySelectorAll('span')).find(
      (node) => node.textContent === '0' && node.className.includes('text-danger'),
    );
    expect(zeroCountLabel).toBeTruthy();
  });

  it('ignores forced yes/no clicks when option is not selected', () => {
    const toggleField = createField({
      field_key: 'meal_slots_toggle_guard',
      field_type: 'multi_select_toggle',
      options: [{ value: 'breakfast', label: 'Breakfast Slot' }],
    });

    render(<Harness field={toggleField} renderer="toggle" />);

    const breakfastYes = screen.getByRole('button', { name: 'Breakfast Slot - Yes' });

    breakfastYes.removeAttribute('disabled');
    fireEvent.click(breakfastYes);

    expect(screen.queryByText('Choose Yes or No to continue.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Breakfast Slot - Yes' })).toBeEnabled();
  });
});
