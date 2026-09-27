import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { FormMarkdownField } from '../FormMarkdownField';

vi.mock('react-simplemde-editor', () => ({
  default: ({
    id,
    value,
    onChange,
  }: {
    id: string;
    value: string;
    onChange: (val: string) => void;
  }) => (
    <textarea
      id={id}
      data-testid="mock-simplemde"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

function Wrapper({ required = false }: { required?: boolean }) {
  const { control } = useForm<{ notes: string }>({
    defaultValues: { notes: 'Initial text' },
  });

  return (
    <FormMarkdownField
      control={control}
      name="notes"
      label="Notes Field"
      placeholder="Type here..."
      required={required}
    />
  );
}

describe('FormMarkdownField', () => {
  it('renders label, required indicator, and mock simplemde editor', () => {
    render(<Wrapper required={true} />);

    expect(screen.getByText('Notes Field')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();

    const textarea = screen.getByTestId('mock-simplemde');
    expect(textarea).toHaveValue('Initial text');

    fireEvent.change(textarea, { target: { value: 'Updated text' } });
    expect(textarea).toHaveValue('Updated text');
  });
});
