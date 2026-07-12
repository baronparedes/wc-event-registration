import { zodResolver } from '@hookform/resolvers/zod';
import { fireEvent, render, screen } from '@testing-library/react';
import { useFieldArray, useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type UpdateMemberInput, updateMemberSchema } from '@/lib/domain/members';

import { MetadataEntriesEditor } from '../MetadataEntriesEditor';

const DEFAULT_FORM_VALUES: UpdateMemberInput = {
  full_name: '',
  first_name: 'Jane',
  last_name: 'Doe',
  nickname: 'Janie',
  email: '',
  phone: '',
  date_of_birth: '',
  role: 'player',
  category: 'adult',
  metadata_entries: [],
};

function TestWrapper({
  initialEntries = [],
  disabled = false,
}: {
  initialEntries?: { key: string; value: string }[];
  disabled?: boolean;
}) {
  const {
    register,
    control,
    formState: { errors },
  } = useForm<UpdateMemberInput>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: { ...DEFAULT_FORM_VALUES, metadata_entries: initialEntries },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'metadata_entries' });

  return (
    <MetadataEntriesEditor
      fields={fields}
      register={register}
      errors={errors}
      remove={remove}
      append={append}
      disabled={disabled}
    />
  );
}

describe('MetadataEntriesEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state message when there are no entries', () => {
    render(<TestWrapper />);

    expect(
      screen.getByText(
        /No additional metadata\. Click "Add field" to add custom key-value pairs\./i,
      ),
    ).toBeInTheDocument();
  });

  it('renders existing entries as editable key and value inputs', () => {
    render(
      <TestWrapper
        initialEntries={[
          { key: 'is_oic', value: 'true' },
          { key: 'first_sunday', value: 'yes' },
        ]}
      />,
    );

    expect(screen.getByDisplayValue('is_oic')).toBeInTheDocument();
    expect(screen.getByDisplayValue('true')).toBeInTheDocument();
    expect(screen.getByDisplayValue('first_sunday')).toBeInTheDocument();
    expect(screen.getByDisplayValue('yes')).toBeInTheDocument();
  });

  it('appends a new empty entry when Add field is clicked', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByRole('button', { name: /add field/i }));

    expect(screen.getByLabelText('Metadata key 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Metadata value 1')).toBeInTheDocument();
  });

  it('removes an entry when Remove button is clicked', () => {
    render(<TestWrapper initialEntries={[{ key: 'tag', value: 'vip' }]} />);

    expect(screen.getByDisplayValue('tag')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove metadata field' }));

    expect(screen.queryByDisplayValue('tag')).not.toBeInTheDocument();
    expect(screen.getByText(/No additional metadata/i)).toBeInTheDocument();
  });

  it('disables all inputs and buttons when disabled prop is true', () => {
    render(<TestWrapper initialEntries={[{ key: 'foo', value: 'bar' }]} disabled={true} />);

    expect(screen.getByLabelText('Metadata key 1')).toBeDisabled();
    expect(screen.getByLabelText('Metadata value 1')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove metadata field' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /add field/i })).toBeDisabled();
  });

  it('does not show empty state when entries are present', () => {
    render(<TestWrapper initialEntries={[{ key: 'k', value: 'v' }]} />);

    expect(screen.queryByText(/No additional metadata/i)).not.toBeInTheDocument();
  });
});
