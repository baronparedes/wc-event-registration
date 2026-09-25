import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import type {
  DynamicFieldResponseValues,
  EventFieldType,
  PublicEventField,
} from '@/lib/domain/event-fields';
import {
  DynamicFieldRenderer,
  type DynamicFieldRendererProps,
} from '@/pages/events/[slug]/register/components/field-renderers/DynamicFieldRenderer';

function buildField(
  fieldType: EventFieldType,
  fieldKey: string,
  placeholder?: string,
): PublicEventField {
  return {
    id: `field-${fieldKey}`,
    event_id: 'event-1',
    field_key: fieldKey,
    label: `Label for ${fieldKey}`,
    field_type: fieldType,
    is_required: false,
    is_active: true,
    placeholder: placeholder ?? null,
    help_text: null,
    options:
      fieldType === 'select' || fieldType === 'radio' || fieldType === 'multi_select'
        ? [
            { label: 'Option A', value: 'opt_a' },
            { label: 'Option B', value: 'opt_b' },
          ]
        : [],
    validation_rules: {},
    display_order: 0,
    applicability: 'both',
  };
}

function TestHarness(props: Omit<DynamicFieldRendererProps, 'dynamicForm'>) {
  const dynamicForm = useForm<DynamicFieldResponseValues>();
  return <DynamicFieldRenderer {...props} dynamicForm={dynamicForm} />;
}

describe('DynamicFieldRenderer', () => {
  it('renders text field input', () => {
    render(<TestHarness field={buildField('text', 'full_name', 'Enter name')} />);
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
  });

  it('renders email field input', () => {
    render(<TestHarness field={buildField('email', 'user_email', 'Enter email')} />);
    expect(screen.getByPlaceholderText('Enter email')).toHaveAttribute('type', 'email');
  });

  it('renders phone field input', () => {
    render(<TestHarness field={buildField('phone', 'user_phone', '09123456789')} />);
    expect(screen.getByPlaceholderText('09123456789')).toHaveAttribute('type', 'tel');
  });

  it('renders number field input', () => {
    render(<TestHarness field={buildField('number', 'user_age', 'Enter age')} />);
    expect(screen.getByPlaceholderText('Enter age')).toHaveAttribute('type', 'number');
  });

  it('renders textarea field', () => {
    const { container } = render(<TestHarness field={buildField('textarea', 'comments')} />);
    expect(container.querySelector('textarea')).toBeInTheDocument();
  });

  it('renders select field with options', () => {
    render(<TestHarness field={buildField('select', 'tshirt_size')} />);
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('renders radio field with options', () => {
    render(<TestHarness field={buildField('radio', 'preferred_session')} />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('renders checkbox field', () => {
    render(<TestHarness field={buildField('checkbox', 'agree_terms')} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('falls back to text field renderer for unknown field types', () => {
    const unknownField = buildField('text', 'unknown_field', 'Fallback text');
    // @ts-expect-error testing unknown runtime type fallback
    unknownField.field_type = 'some_unrecognized_type';

    render(<TestHarness field={unknownField} />);
    expect(screen.getByPlaceholderText('Fallback text')).toBeInTheDocument();
  });
});
