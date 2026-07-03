import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
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
  const { register } = useForm<TestFormValues>({
    defaultValues: { status: 'draft' },
  });

  return (
    <FormSelectField
      id="status"
      label="Status"
      required
      labelAdornment={<span data-testid="status-adornment">adornment</span>}
      registration={register('status')}
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
  it('renders options, helper text, and base styling when there is no error', () => {
    render(<Harness helperText="Choose a status" selectClassName="custom-select" />);

    expect(screen.getByLabelText(/^Status/)).toBeInTheDocument();
    expect(screen.getByText('Choose a status')).toBeInTheDocument();
    expect(screen.getByTestId('status-adornment')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Published' })).toBeInTheDocument();

    const select = screen.getByLabelText(/^Status/);
    expect(select.className).toContain('border-border');
    expect(select.className).toContain('custom-select');
  });

  it('renders error state styling and disabled mode', () => {
    render(<Harness error="Status is required" disabled />);

    const select = screen.getByLabelText(/^Status/);

    expect(select).toBeDisabled();
    expect(select.className).toContain('border-red-400');
    expect(screen.getByText('Status is required')).toBeInTheDocument();
  });
});
