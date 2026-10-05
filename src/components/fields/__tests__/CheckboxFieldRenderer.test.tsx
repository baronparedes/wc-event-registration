import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { CheckboxFieldRenderer } from '@/components/fields/CheckboxFieldRenderer';
import type { DynamicFieldLike } from '@/lib/domain/dynamic-fields';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';

function TestHarness({
  field,
  defaultValue = false,
}: {
  field: DynamicFieldLike;
  defaultValue?: boolean;
}) {
  const form = useForm<DynamicFieldResponseValues>({
    defaultValues: { [field.field_key]: defaultValue },
  });

  return <CheckboxFieldRenderer field={field} dynamicForm={form} />;
}

describe('CheckboxFieldRenderer', () => {
  const baseField: DynamicFieldLike = {
    id: 'field-check-1',
    field_key: 'terms_agreement',
    label: 'Terms Agreement',
    field_type: 'checkbox',
    is_required: false,
    placeholder: 'I accept the terms and conditions.',
  };

  it('renders checkbox with custom placeholder label', () => {
    render(<TestHarness field={baseField} />);

    expect(screen.getByText('I accept the terms and conditions.')).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('falls back to default label if placeholder is missing', () => {
    render(<TestHarness field={{ ...baseField, placeholder: undefined }} />);

    expect(screen.getByText('I confirm this statement.')).toBeInTheDocument();
  });

  it('toggles checked state when clicked', () => {
    render(<TestHarness field={baseField} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
