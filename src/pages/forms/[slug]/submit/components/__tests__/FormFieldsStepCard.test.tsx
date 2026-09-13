import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';
import type { FormField } from '@/lib/domain/forms';

import { FormFieldsStepCard } from '../FormFieldsStepCard';

function TestWrapper(props: {
  fields?: FormField[];
  onSubmit?: (values: DynamicFieldResponseValues) => void;
  isSubmitting?: boolean;
  submitErrorMessage?: string | null;
  onBack?: () => void;
  submitButtonLabel?: string;
  inactivityTimeoutMs?: number;
  onInactivityTimeout?: () => void;
}) {
  const dynamicForm = useForm<DynamicFieldResponseValues>({
    defaultValues: { comments: 'Initial comment' },
  });

  const sampleFields: FormField[] = props.fields ?? [
    {
      id: 'field-1',
      form_id: 'form-123',
      field_key: 'comments',
      label: 'Comments',
      field_type: 'text',
      is_required: true,
      is_active: true,
      placeholder: 'Enter comments',
      help_text: null,
      options: [],
      validation_rules: {},
      field_applicability: 'all',
      display_order: 1,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  ];

  return (
    <FormFieldsStepCard
      fields={sampleFields}
      dynamicForm={dynamicForm}
      onSubmit={props.onSubmit ?? vi.fn()}
      isSubmitting={props.isSubmitting}
      submitErrorMessage={props.submitErrorMessage}
      submitButtonLabel={props.submitButtonLabel}
      onBack={props.onBack}
      inactivityTimeoutMs={props.inactivityTimeoutMs}
      onInactivityTimeout={props.onInactivityTimeout}
    />
  );
}

describe('FormFieldsStepCard', () => {
  it('renders fields with label and handles submit', async () => {
    const handleSubmit = vi.fn();

    render(<TestWrapper onSubmit={handleSubmit} />);

    expect(screen.getByText('Step 2: Questions')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter comments')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Submit Form/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  it('renders help text when provided on a field', () => {
    const fieldsWithHelp: FormField[] = [
      {
        id: 'field-1',
        form_id: 'form-123',
        field_key: 'comments',
        label: 'Comments',
        field_type: 'text',
        is_required: false,
        is_active: true,
        placeholder: null,
        help_text: 'Please enter any additional feedback',
        options: [],
        validation_rules: {},
        field_applicability: 'all',
        display_order: 1,
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ];

    render(<TestWrapper fields={fieldsWithHelp} />);

    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Please enter any additional feedback')).toBeInTheDocument();
  });

  it('renders empty fields message when no fields are visible', () => {
    render(<TestWrapper fields={[]} />);

    expect(screen.getByText('No questions required for this form.')).toBeInTheDocument();
  });

  it('renders error message banner when submitErrorMessage is present', () => {
    render(<TestWrapper submitErrorMessage="Failed to process form" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to process form');
  });

  it('shows submitting state on submit button when isSubmitting is true', () => {
    render(<TestWrapper isSubmitting={true} />);

    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
  });

  it('calls onBack when back button is clicked', () => {
    const handleBack = vi.fn();

    render(<TestWrapper onBack={handleBack} />);

    const backBtn = screen.getByRole('button', { name: 'Back' });
    fireEvent.click(backBtn);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('renders inactivity timer message when inactivityTimeoutMs is provided', () => {
    render(<TestWrapper inactivityTimeoutMs={5000} onInactivityTimeout={vi.fn()} />);

    expect(screen.getByText(/Resetting form in 5s if inactive/i)).toBeInTheDocument();
  });
});
