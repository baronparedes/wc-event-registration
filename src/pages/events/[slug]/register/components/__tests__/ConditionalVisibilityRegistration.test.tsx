import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { filterVisibleFieldValues, isFieldVisible } from '@/lib/domain';
import type { PublicEventField } from '@/lib/domain/event-fields';

import { DynamicFieldsStepCard } from '../DynamicRegistrationFieldsStep';

function DynamicFieldsStepCardHarness(props: {
  activeFields: PublicEventField[];
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  const dynamicForm = useForm<Record<string, unknown>>({
    defaultValues: {
      category: 'Standard',
      specify_other: 'My Previous Entry',
    },
  });

  function handleFormSubmit(values: Record<string, unknown>) {
    const cleaned = filterVisibleFieldValues(props.activeFields, values);
    props.onSubmit(cleaned);
  }

  return (
    <DynamicFieldsStepCard
      matchedMember={{
        full_name: 'Jane Doe',
        role: 'Member',
        first_name: 'Jane',
        last_initial: 'D',
        member_token: 'MEM-001',
      }}
      isLoadingFields={false}
      isFieldsError={false}
      fieldConfigIssues={[]}
      activeFields={props.activeFields}
      dynamicForm={dynamicForm}
      onSubmit={handleFormSubmit}
      fieldErrorMessage={(key) => dynamicForm.formState.errors[key]?.message as string}
      isSubmitPending={false}
      submitErrorMessage={null}
      submitSuccessMessage={null}
    />
  );
}

describe('Conditional Visibility in Event Registration', () => {
  const fields: PublicEventField[] = [
    {
      id: 'field-1',
      event_id: 'event-1',
      field_key: 'category',
      label: 'Registration Category',
      field_type: 'select',
      applicability: 'both',
      is_required: true,
      is_active: true,
      placeholder: null,
      help_text: null,
      options: [
        { label: 'Standard', value: 'Standard' },
        { label: 'VIP', value: 'VIP' },
        { label: 'Others', value: 'Others' },
      ],
      validation_rules: {},
      display_order: 1,
    },
    {
      id: 'field-2',
      event_id: 'event-1',
      field_key: 'specify_other',
      label: 'Specify Other Category',
      field_type: 'text',
      applicability: 'both',
      is_required: true,
      is_active: true,
      placeholder: null,
      help_text: null,
      options: [],
      validation_rules: {
        visibility_rule: {
          depends_on_field_key: 'category',
          equals_value: 'Others',
        },
      },
      display_order: 2,
    },
  ];

  function selectDropdownOption(triggerLabel: string | RegExp, optionName: string | RegExp) {
    const trigger = screen.getByRole('button', { name: triggerLabel });
    fireEvent.click(trigger);
    const option = screen.getByRole('option', { name: optionName });
    fireEvent.click(option);
  }

  it('hides dependent field when parent value does not match', () => {
    render(<DynamicFieldsStepCardHarness activeFields={fields} onSubmit={() => {}} />);

    expect(screen.getByText('Registration Category')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Specify Other Category/i)).not.toBeInTheDocument();
  });

  it('shows dependent field when parent value equals target value', () => {
    render(<DynamicFieldsStepCardHarness activeFields={fields} onSubmit={() => {}} />);

    selectDropdownOption(/Registration Category/i, /Others/i);

    expect(screen.getByLabelText(/Specify Other Category/i)).toBeInTheDocument();
  });

  it('preserves form state when hidden and reveals it when parent changes back', () => {
    render(<DynamicFieldsStepCardHarness activeFields={fields} onSubmit={() => {}} />);

    // Select "Others" -> reveals specify_other input prefilled with default value "My Previous Entry"
    selectDropdownOption(/Registration Category/i, /Others/i);
    const specifyInput = screen.getByLabelText(/Specify Other Category/i) as HTMLInputElement;
    expect(specifyInput.value).toBe('My Previous Entry');

    // Switch away to "VIP" -> specify_other input disappears
    selectDropdownOption(/Registration Category/i, /VIP/i);
    expect(screen.queryByLabelText(/Specify Other Category/i)).not.toBeInTheDocument();

    // Switch back to "Others" -> specify_other input reappears with value intact
    selectDropdownOption(/Registration Category/i, /Others/i);
    expect(screen.getByLabelText(/Specify Other Category/i)).toHaveValue('My Previous Entry');
  });

  it('filters out hidden field values upon submission', () => {
    const formValues = {
      category: 'Standard',
      specify_other: 'Previous Entry',
    };

    expect(isFieldVisible(fields[1], fields, formValues)).toBe(false);

    const cleaned = filterVisibleFieldValues(fields, formValues);
    expect(cleaned).toEqual({
      category: 'Standard',
    });
    expect(cleaned).not.toHaveProperty('specify_other');
  });
});
