import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import type { UpdateMemberInput } from '@/lib/domain/members';

import { DGroupEditor } from '../DGroupEditor';

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

  return <DGroupEditor control={control} setValue={setValue} disabled={disabled} />;
}

describe('DGroupEditor', () => {
  it('renders all 7 DGroup fields blank when metadata is empty', () => {
    render(<TestWrapper />);

    const statusButton = screen.getByRole('button', { name: /dgroup status/i });
    expect(statusButton).toBeInTheDocument();
    expect(statusButton).toHaveTextContent('None / Unassigned');
    expect(screen.getByLabelText('Member Since')).toHaveValue('');
    expect(screen.getByLabelText('DGroup Leader')).toHaveValue('');
    expect(screen.getByLabelText('Leader Contact')).toHaveValue('');
    expect(screen.getByLabelText('Leader Email')).toHaveValue('');
    expect(screen.getByLabelText('Miner Open Schedule')).toHaveValue('');
    expect(screen.getByLabelText('Miner Open Slots')).toHaveValue(null);
  });

  it('populates existing metadata values correctly', () => {
    render(
      <TestWrapper
        initialEntries={[
          { key: 'dgroup_status', value: 'leader' },
          { key: 'dgroup_member_since', value: '2023-05-01' },
          { key: 'dgroup_leader', value: 'Leader Luke' },
          { key: 'dgroup_leader_contact', value: '09171234567' },
          { key: 'dgroup_leader_email', value: 'luke@example.com' },
          { key: 'dgroup_miner_open_schedule', value: 'Saturdays 3PM' },
          { key: 'dgroup_miner_open_slots', value: '5' },
        ]}
      />,
    );

    const statusButton = screen.getByRole('button', { name: /dgroup status/i });
    expect(statusButton).toHaveTextContent('Leader');
    expect(screen.getByLabelText('Member Since')).toHaveValue('May-23');
    expect(screen.getByLabelText('DGroup Leader')).toHaveValue('Leader Luke');
    expect(screen.getByLabelText('Leader Contact')).toHaveValue('09171234567');
    expect(screen.getByLabelText('Leader Email')).toHaveValue('luke@example.com');
    expect(screen.getByLabelText('Miner Open Schedule')).toHaveValue('Saturdays 3PM');
    expect(screen.getByLabelText('Miner Open Slots')).toHaveValue(5);
  });

  it('updates a field and changes the input value', () => {
    render(<TestWrapper initialEntries={[{ key: 'dgroup_leader', value: 'Old Leader' }]} />);

    const leaderInput = screen.getByLabelText('DGroup Leader');
    expect(leaderInput).toHaveValue('Old Leader');

    fireEvent.change(leaderInput, { target: { value: 'New Leader' } });
    expect(leaderInput).toHaveValue('New Leader');
  });

  it('disables all fields when disabled prop is true', () => {
    render(
      <TestWrapper initialEntries={[{ key: 'dgroup_leader', value: 'Leader' }]} disabled={true} />,
    );

    expect(screen.getByRole('button', { name: /dgroup status/i })).toBeDisabled();
    expect(screen.getByLabelText('Member Since')).toHaveAttribute('readOnly', '');
    expect(screen.getByLabelText('DGroup Leader')).toHaveAttribute('readOnly', '');
    expect(screen.getByLabelText('Leader Contact')).toHaveAttribute('readOnly', '');
    expect(screen.getByLabelText('Leader Email')).toHaveAttribute('readOnly', '');
    expect(screen.getByLabelText('Miner Open Schedule')).toHaveAttribute('readOnly', '');
    expect(screen.getByLabelText('Miner Open Slots')).toHaveAttribute('readOnly', '');
  });
});
