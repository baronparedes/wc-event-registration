import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import {
  ColorPickerFieldRenderer,
  EmailFieldRenderer,
  NumberFieldRenderer,
  PhoneFieldRenderer,
  TextFieldRenderer,
  TextareaFieldRenderer,
} from '@/components/fields/TextFieldRenderer';
import type { DynamicFieldLike } from '@/lib/domain/dynamic-fields';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';

function TestHarness({
  field,
  Component,
  defaultValues,
}: {
  field: DynamicFieldLike;
  Component: React.ComponentType<{
    field: DynamicFieldLike;
    dynamicForm: ReturnType<typeof useForm<DynamicFieldResponseValues>>;
  }>;
  defaultValues?: DynamicFieldResponseValues;
}) {
  const form = useForm<DynamicFieldResponseValues>({
    defaultValues: defaultValues ?? { [field.field_key]: '' },
  });

  return <Component field={field} dynamicForm={form} />;
}

describe('TextFieldRenderers', () => {
  const baseField: DynamicFieldLike = {
    id: 'field-1',
    field_key: 'custom_key',
    label: 'Custom Label',
    field_type: 'text',
    is_required: false,
    placeholder: 'Enter text here',
  };

  it('renders TextFieldRenderer with placeholder and registers changes', () => {
    render(<TestHarness field={baseField} Component={TextFieldRenderer} />);

    const input = screen.getByPlaceholderText('Enter text here') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('text');

    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(input.value).toBe('Hello');
  });

  it('renders EmailFieldRenderer with email input type', () => {
    render(
      <TestHarness field={{ ...baseField, field_type: 'email' }} Component={EmailFieldRenderer} />,
    );

    const input = screen.getByPlaceholderText('Enter text here') as HTMLInputElement;
    expect(input.type).toBe('email');
  });

  it('renders PhoneFieldRenderer with tel input type', () => {
    render(
      <TestHarness field={{ ...baseField, field_type: 'phone' }} Component={PhoneFieldRenderer} />,
    );

    const input = screen.getByPlaceholderText('Enter text here') as HTMLInputElement;
    expect(input.type).toBe('tel');
  });

  it('renders NumberFieldRenderer with number input type', () => {
    render(
      <TestHarness
        field={{ ...baseField, field_type: 'number' }}
        Component={NumberFieldRenderer}
      />,
    );

    const input = screen.getByPlaceholderText('Enter text here') as HTMLInputElement;
    expect(input.type).toBe('number');
  });

  it('renders TextareaFieldRenderer with rows', () => {
    render(
      <TestHarness
        field={{ ...baseField, field_type: 'textarea' }}
        Component={TextareaFieldRenderer}
      />,
    );

    const textarea = screen.getByPlaceholderText('Enter text here') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('renders ColorPickerFieldRenderer with color swatch input', () => {
    render(
      <TestHarness
        field={{ ...baseField, field_type: 'color_picker' }}
        Component={ColorPickerFieldRenderer}
      />,
    );

    const colorInput = document.getElementById('field-custom_key') as HTMLInputElement;
    expect(colorInput).toBeInTheDocument();
    expect(colorInput.type).toBe('color');
  });
});
