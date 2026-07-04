import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { RuleInput } from '@/pages/admin/events/[id]/attendance/fields/components/RuleInput';

function TestHarness(props: {
  type: 'number' | 'date' | 'text';
  disabled?: boolean;
  helperText?: string;
}) {
  const { register } = useForm<{ rule: string }>({
    defaultValues: { rule: '' },
  });

  return (
    <RuleInput
      id="test-rule"
      label="Test Rule"
      type={props.type}
      registration={register('rule')}
      disabled={props.disabled}
      placeholder="Enter value"
      helperText={props.helperText}
    />
  );
}

describe('RuleInput', () => {
  it('renders label and input field with correct type', () => {
    render(<TestHarness type="number" />);

    expect(screen.getByLabelText('Test Rule')).toBeInTheDocument();
    const input = screen.getByRole('spinbutton', { name: 'Test Rule' });
    expect(input).toHaveAttribute('type', 'number');
  });

  it('renders date input correctly', () => {
    render(<TestHarness type="date" />);

    const input = screen.getByDisplayValue('');
    expect(input).toHaveAttribute('type', 'date');
  });

  it('renders text input correctly', () => {
    render(<TestHarness type="text" />);

    const input = screen.getByRole('textbox', { name: 'Test Rule' });
    expect(input).toHaveAttribute('type', 'text');
  });

  it('applies placeholder when provided', () => {
    render(<TestHarness type="text" />);

    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
  });

  it('displays helper text when provided', () => {
    render(<TestHarness type="number" helperText="This is helpful" />);

    expect(screen.getByText('This is helpful')).toBeInTheDocument();
  });

  it('does not display helper text when not provided', () => {
    const { container } = render(<TestHarness type="number" />);

    const helperTexts = container.querySelectorAll('.text-xs');
    expect(helperTexts.length).toBe(0);
  });

  it('disables input when disabled prop is true', () => {
    render(<TestHarness type="number" disabled={true} />);

    const input = screen.getByRole('spinbutton');
    expect(input).toBeDisabled();
  });

  it('enables input when disabled prop is false', () => {
    render(<TestHarness type="number" disabled={false} />);

    const input = screen.getByRole('spinbutton');
    expect(input).not.toBeDisabled();
  });

  it('allows input of values for number type', () => {
    render(<TestHarness type="number" />);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '42' } });

    expect(input.value).toBe('42');
  });

  it('allows input of date values', () => {
    render(<TestHarness type="date" />);

    const input = screen.getByDisplayValue('') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2025-12-25' } });

    expect(input.value).toBe('2025-12-25');
  });

  it('allows input of text values', () => {
    render(<TestHarness type="text" />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test-pattern-123' } });

    expect(input.value).toBe('test-pattern-123');
  });

  it('applies correct styling classes', () => {
    const { container } = render(<TestHarness type="number" />);

    const input = container.querySelector('input');
    expect(input?.className).toContain('rounded-md');
    expect(input?.className).toContain('border');
    expect(input?.className).toContain('focus:ring-primary');
  });

  it('associates input with correct label via htmlFor', () => {
    render(<TestHarness type="number" />);

    const label = screen.getByText('Test Rule');
    expect(label).toHaveAttribute('for', 'test-rule');
  });
});
