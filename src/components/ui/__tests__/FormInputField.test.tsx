import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { FormInputField } from '@/components/ui/FormInputField';

type TestFormValues = {
  title: string;
};

function RegisteredHarness(props: {
  error?: string | null;
  helperText?: string;
  disabled?: boolean;
  inputClassName?: string;
}) {
  const { register } = useForm<TestFormValues>({
    defaultValues: { title: 'Initial' },
  });

  return (
    <FormInputField
      id="title"
      label="Title"
      required
      registration={register('title')}
      placeholder="Event title"
      helperText={props.helperText}
      error={props.error}
      disabled={props.disabled}
      inputClassName={props.inputClassName}
      labelAdornment={<span data-testid="title-adornment">adornment</span>}
    />
  );
}

describe('FormInputField', () => {
  it('renders registered input with helper text and non-error styling', () => {
    render(
      <RegisteredHarness helperText="Used on registration page" inputClassName="custom-input" />,
    );

    const input = screen.getByLabelText(/^Title/);

    expect(input).toHaveAttribute('placeholder', 'Event title');
    expect(input.className).toContain('border-border');
    expect(input.className).toContain('custom-input');
    expect(screen.getByText('Used on registration page')).toBeInTheDocument();
    expect(screen.getByTestId('title-adornment')).toBeInTheDocument();
  });

  it('renders error styling and message in registered mode', () => {
    render(<RegisteredHarness error="Title is required" disabled />);

    const input = screen.getByLabelText(/^Title/);

    expect(input).toBeDisabled();
    expect(input.className).toContain('border-red-400');
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('supports controlled mode and passes through input attributes', () => {
    const onChange = vi.fn();

    render(
      <FormInputField
        id="email"
        label="Email"
        value="initial@example.com"
        onChange={onChange}
        type="email"
        autoComplete="email"
        readOnly
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Email' });

    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('autocomplete', 'email');
    expect(input).toHaveAttribute('readonly');

    fireEvent.change(input, { target: { value: 'updated@example.com' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
