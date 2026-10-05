import { useEffect } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import type { DynamicFieldResponseValues } from '@/lib/domain/dynamic-fields';
import type { FormField } from '@/lib/domain/forms';
import { FormFieldsStepCard } from '@/pages/forms/[slug]/submit/components/FormFieldsStepCard';

function TestHarness({
  fields,
  onSubmit = vi.fn(),
  submitErrorMessage,
  onBack,
  hasError = false,
  inactivityTimeoutMs,
  onInactivityTimeout,
}: {
  fields: FormField[];
  onSubmit?: (values: DynamicFieldResponseValues) => void;
  submitErrorMessage?: string | null;
  onBack?: () => void;
  hasError?: boolean;
  inactivityTimeoutMs?: number;
  onInactivityTimeout?: () => void;
}) {
  const dynamicForm = useForm<DynamicFieldResponseValues>({
    defaultValues: {},
  });

  useEffect(() => {
    if (hasError && fields.length > 0) {
      dynamicForm.setError(fields[0].field_key, {
        message: 'This field is required',
      });
    }
  }, [hasError, fields, dynamicForm]);

  return (
    <FormFieldsStepCard
      fields={fields}
      dynamicForm={dynamicForm}
      onSubmit={onSubmit}
      submitErrorMessage={submitErrorMessage}
      onBack={onBack}
      inactivityTimeoutMs={inactivityTimeoutMs}
      onInactivityTimeout={onInactivityTimeout}
    />
  );
}

describe('FormFieldsStepCard', () => {
  const sampleFields: FormField[] = [
    {
      id: 'ff-1',
      form_id: 'form-1',
      field_key: 'feedback',
      label: 'Your Feedback',
      field_type: 'text',
      is_required: true,
      is_active: true,
      display_order: 1,
      field_applicability: 'all',
      placeholder: 'Write here',
      help_text: null,
      options: [],
      validation_rules: {},
      created_at: '',
      updated_at: '',
    },
    {
      id: 'ff-2',
      form_id: 'form-1',
      field_key: 'optional_note',
      label: 'Optional Note',
      field_type: 'text',
      is_required: false,
      is_active: true,
      display_order: 2,
      field_applicability: 'all',
      placeholder: 'Note',
      help_text: null,
      options: [],
      validation_rules: {},
      created_at: '',
      updated_at: '',
    },
  ];

  it('renders empty notice when there are no fields', () => {
    render(<TestHarness fields={[]} />);

    expect(screen.getByText('No questions required for this form.')).toBeInTheDocument();
  });

  it('renders fields and submit button', () => {
    const onSubmit = vi.fn();
    render(<TestHarness fields={sampleFields} onSubmit={onSubmit} />);

    expect(screen.getByText('Your Feedback')).toBeInTheDocument();
    expect(screen.getByText('Optional Note')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Form' })).toBeInTheDocument();
  });

  it('renders field validation error message when present', () => {
    render(<TestHarness fields={sampleFields} hasError />);

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('renders error banner when submitErrorMessage is present', () => {
    render(<TestHarness fields={sampleFields} submitErrorMessage="Submission limit reached" />);

    expect(screen.getByText('Submission limit reached')).toBeInTheDocument();
  });

  it('renders back button and triggers onBack callback', () => {
    const onBack = vi.fn();
    render(<TestHarness fields={sampleFields} onBack={onBack} />);

    const backButton = screen.getByRole('button', { name: /Back/i });
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalled();
  });
});
