import { fireEvent, render, screen } from '@testing-library/react';
import { useForm, useWatch } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { FormSelectField } from '@/components/ui/FormSelectField';

type TestFormValues = {
  status: string;
};

function Harness(props: {
  error?: string;
  disabled?: boolean;
  helperText?: string;
  selectClassName?: string;
}) {
  const { control, register } = useForm<TestFormValues>({
    defaultValues: { status: 'draft' },
  });
  const status = useWatch({ control, name: 'status' });

  return (
    <FormSelectField
      id="status"
      label="Status"
      required
      labelAdornment={<span data-testid="status-adornment">adornment</span>}
      registration={register('status')}
      value={status}
      options={[
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
      ]}
      error={props.error}
      disabled={props.disabled}
      helperText={props.helperText}
      selectClassName={props.selectClassName}
    />
  );
}

describe('FormSelectField', () => {
  it('renders label, helper text, adornment, and shows selected value in trigger', () => {
    render(<Harness helperText="Choose a status" selectClassName="custom-select" />);

    expect(screen.getByLabelText(/^Status/)).toBeInTheDocument();
    expect(screen.getByText('Choose a status')).toBeInTheDocument();
    expect(screen.getByTestId('status-adornment')).toBeInTheDocument();
    // Shows the current value's label in the trigger
    expect(screen.getByText('Draft')).toBeInTheDocument();

    const trigger = screen.getByLabelText(/^Status/);
    expect(trigger.className).toContain('border-border');
    expect(trigger.className).toContain('custom-select');
  });

  it('opens the dropdown and shows options when trigger is clicked', () => {
    render(<Harness />);

    fireEvent.click(screen.getByLabelText(/^Status/));

    expect(screen.getByRole('option', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Published' })).toBeInTheDocument();
  });

  it('renders error state styling and disabled mode', () => {
    render(<Harness error="Status is required" disabled />);

    const trigger = screen.getByLabelText(/^Status/);

    expect(trigger).toBeDisabled();
    expect(trigger.className).toContain('border-red-400');
    expect(screen.getByText('Status is required')).toBeInTheDocument();
  });
});
