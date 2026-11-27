import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import type { UpdateMemberInput } from '@/lib/domain/members';

import { CivilStatusEditor } from '../CivilStatusEditor';

function TestWrapper({
  initialEntries = [],
  disabled = false,
}: {
  initialEntries?: { key: string; value: string }[];
  disabled?: boolean;
}) {
  const { control, setValue } = useForm<UpdateMemberInput>({
    defaultValues: {
      metadata_entries: initialEntries,
    } as unknown as UpdateMemberInput,
  });

  return <CivilStatusEditor control={control} setValue={setValue} disabled={disabled} />;
}

describe('CivilStatusEditor', () => {
  it('renders both fields blank when metadata is empty', () => {
    render(<TestWrapper />);

    const statusButton = screen.getByRole('button', { name: /civil status/i });
    expect(statusButton).toBeInTheDocument();
    expect(statusButton).toHaveTextContent('None / Unspecified');
    expect(screen.getByLabelText('Wedding Anniversary Date')).toHaveValue('');
  });

  it('populates and normalizes existing metadata values', () => {
    render(
      <TestWrapper
        initialEntries={[
          { key: 'civil_status', value: 'married' },
          { key: 'wedanniv_date', value: '1/14/95' },
        ]}
      />,
    );

    const statusButton = screen.getByRole('button', { name: /civil status/i });
    expect(statusButton).toHaveTextContent('Married');
    expect(screen.getByLabelText('Wedding Anniversary Date')).toHaveValue('1995-01-14');
  });

  it('updates civil status and wedding anniversary date', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByRole('button', { name: /civil status/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Married' }));
    expect(screen.getByRole('button', { name: /civil status/i })).toHaveTextContent('Married');

    const anniversaryInput = screen.getByLabelText('Wedding Anniversary Date');
    fireEvent.change(anniversaryInput, { target: { value: '2020-06-15' } });
    expect(anniversaryInput).toHaveValue('2020-06-15');
  });

  it('disables fields when disabled prop is true', () => {
    render(
      <TestWrapper
        initialEntries={[
          { key: 'civil_status', value: 'Single' },
          { key: 'wedanniv_date', value: '2018-05-01' },
        ]}
        disabled={true}
      />,
    );

    expect(screen.getByRole('button', { name: /civil status/i })).toBeDisabled();
    expect(screen.getByLabelText('Wedding Anniversary Date')).toHaveAttribute('readOnly', '');
  });
});
