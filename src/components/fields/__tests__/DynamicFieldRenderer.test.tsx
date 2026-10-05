import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { DynamicFieldRenderer } from '@/components/fields/DynamicFieldRenderer';
import type { DynamicFieldLike, DynamicFieldType } from '@/lib/domain/dynamic-fields';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';

function TestHarness({ field }: { field: DynamicFieldLike }) {
  const form = useForm<DynamicFieldResponseValues>();
  return <DynamicFieldRenderer field={field} dynamicForm={form} />;
}

describe('DynamicFieldRenderer', () => {
  const allFieldTypes: DynamicFieldType[] = [
    'text',
    'textarea',
    'email',
    'phone',
    'number',
    'select',
    'radio',
    'multi_select',
    'multi_select_toggle',
    'date',
    'datetime',
    'checkbox',
    'color_picker',
    'rating',
  ];

  allFieldTypes.forEach((type) => {
    it(`renders component for ${type} field type`, () => {
      const { container } = render(
        <TestHarness
          field={{
            id: `field-${type}`,
            field_key: `key_${type}`,
            label: `Label ${type}`,
            field_type: type,
            is_required: false,
            placeholder: `Placeholder for ${type}`,
            options: [{ value: '1', label: 'One' }],
          }}
        />,
      );

      // Component rendered without crashing
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('falls back to TextFieldRenderer for unsupported field type', () => {
    render(
      <TestHarness
        field={{
          id: 'unknown-1',
          field_key: 'custom_unknown',
          label: 'Unknown',
          field_type: 'some_future_type' as DynamicFieldType,
          is_required: false,
          placeholder: 'Future input',
        }}
      />,
    );

    expect(screen.getByPlaceholderText('Future input')).toBeInTheDocument();
  });
});
