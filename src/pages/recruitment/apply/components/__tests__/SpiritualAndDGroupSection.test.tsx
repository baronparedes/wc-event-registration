import { fireEvent, render, screen } from '@testing-library/react';
import { useForm, useWatch } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import type { RecruitmentStep1Input } from '@/lib/domain/recruitment';

import { SpiritualAndDGroupSection } from '../SpiritualAndDGroupSection';

function SpiritualAndDGroupHarness() {
  const form = useForm<RecruitmentStep1Input>({
    defaultValues: {
      spiritual_background: {
        ccf_member_since: '2010 Jan',
        glc1_status: 'Ongoing',
        glc2_status: 'Ongoing',
      },
      dgroup_info: {
        is_constant_attendee: true,
        member_since: '2010 Jan',
        leader_name: 'Test Leader',
        leader_email: 'test.leader@example.com',
        leader_phone: '09171112222',
        is_dgroup_leader: false,
        leader_since: null,
        dgroup_member_count: null,
      },
    },
  });
  const glc2Status = useWatch({
    control: form.control,
    name: 'spiritual_background.glc2_status',
  });
  const leaderSince = useWatch({ control: form.control, name: 'dgroup_info.leader_since' });
  const memberCount = useWatch({ control: form.control, name: 'dgroup_info.dgroup_member_count' });

  return (
    <>
      <SpiritualAndDGroupSection form={form} />
      <output data-testid="glc2-status">{glc2Status ?? 'empty'}</output>
      <output data-testid="leader-since">{leaderSince ?? 'empty'}</output>
      <output data-testid="member-count">{memberCount == null ? 'empty' : memberCount}</output>
    </>
  );
}

function selectOption(triggerName: string, optionName: string) {
  fireEvent.click(screen.getByRole('button', { name: triggerName }));
  fireEvent.click(screen.getByRole('option', { name: optionName }));
}

describe('SpiritualAndDGroupSection', () => {
  it('only shows GLC 2 after GLC 1 completion and clears it when GLC 1 changes', () => {
    render(<SpiritualAndDGroupHarness />);

    expect(screen.queryByRole('button', { name: 'GLC 2 Course Status *' })).not.toBeInTheDocument();
    expect(screen.getByText(/^Member for /)).toBeInTheDocument();

    selectOption('GLC 1 Course Status *', 'Completed');
    expect(screen.getByRole('button', { name: 'GLC 2 Course Status *' })).toBeVisible();
    expect(screen.getByTestId('glc2-status')).toHaveTextContent('empty');

    selectOption('GLC 2 Course Status *', 'Completed');
    expect(screen.getByTestId('glc2-status')).toHaveTextContent('Completed');
    selectOption('GLC 1 Course Status *', 'Ongoing');

    expect(screen.queryByRole('button', { name: 'GLC 2 Course Status *' })).not.toBeInTheDocument();
    expect(screen.getByTestId('glc2-status')).toHaveTextContent('empty');
  });

  it('keeps the member count optional and normalizes blank and entered values', () => {
    render(<SpiritualAndDGroupHarness />);

    const memberCount = document.querySelector<HTMLInputElement>(
      '[name="dgroup_info.dgroup_member_count"]',
    );
    if (!memberCount) throw new Error('Missing DGroup member count input');
    expect(screen.getByTestId('member-count')).toHaveTextContent('empty');

    fireEvent.change(memberCount, { target: { value: '7' } });
    expect(screen.getByTestId('member-count')).toHaveTextContent('7');

    fireEvent.change(memberCount, { target: { value: '' } });
    expect(screen.getByTestId('member-count')).toHaveTextContent('empty');
  });

  it('clears an optional leader month when its month input is emptied', () => {
    render(<SpiritualAndDGroupHarness />);

    const leaderSince = screen.getByLabelText(/DGroup Leader Since/);
    fireEvent.change(leaderSince, { target: { value: '2020-03' } });
    expect(screen.getByTestId('leader-since')).toHaveTextContent('2020 Mar');

    fireEvent.change(leaderSince, { target: { value: '' } });
    expect(screen.getByTestId('leader-since')).toHaveTextContent('empty');
  });
});
