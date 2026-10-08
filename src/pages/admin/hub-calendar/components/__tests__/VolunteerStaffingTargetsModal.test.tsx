import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VolunteerStaffingTargetsModal } from '../VolunteerStaffingTargetsModal';

describe('VolunteerStaffingTargetsModal', () => {
  const defaultTargets = {
    Usher: 25,
    'Backroom Support': 10,
    'Prayer Coach': 50,
    'IMT Support': 4,
    'VMT Support': 2,
  };

  const onSaveMock = vi.fn();
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders inputs with existing targets', () => {
    render(
      <VolunteerStaffingTargetsModal
        isOpen={true}
        onClose={onCloseMock}
        targets={defaultTargets}
        onSaveTargets={onSaveMock}
      />,
    );

    expect(screen.getByText('Configure Volunteer Targets')).toBeInTheDocument();
    expect(screen.getByLabelText('Usher')).toHaveValue('25');
    expect(screen.getByLabelText('Backroom Support')).toHaveValue('10');
    expect(screen.getByLabelText('Prayer Coach')).toHaveValue('50');
  });

  it('allows editing values and saves them', () => {
    render(
      <VolunteerStaffingTargetsModal
        isOpen={true}
        onClose={onCloseMock}
        targets={defaultTargets}
        onSaveTargets={onSaveMock}
      />,
    );

    const usherInput = screen.getByLabelText('Usher');
    fireEvent.change(usherInput, { target: { value: '30' } });

    const saveBtn = screen.getByRole('button', { name: /Save Targets/i });
    fireEvent.click(saveBtn);

    expect(onSaveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Usher: 30,
        'Backroom Support': 10,
      }),
    );
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('resets to defaults when clicking reset button', () => {
    render(
      <VolunteerStaffingTargetsModal
        isOpen={true}
        onClose={onCloseMock}
        targets={{ ...defaultTargets, Usher: 100 }}
        onSaveTargets={onSaveMock}
      />,
    );

    const resetBtn = screen.getByRole('button', { name: /Reset Defaults/i });
    fireEvent.click(resetBtn);

    expect(screen.getByLabelText('Usher')).toHaveValue('25');
  });
});
