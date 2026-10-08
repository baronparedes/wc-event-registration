import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_VOLUNTEER_ROLE_TARGETS } from '@/pages/admin/hub-calendar/utils';

import { VolunteerStaffingTargetsModal } from '../VolunteerStaffingTargetsModal';

describe('VolunteerStaffingTargetsModal', () => {
  const defaultTargets = {
    '9AM': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS },
    '12NN': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS },
    '3PM': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS },
  };

  const onSaveMock = vi.fn();
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders inputs with existing targets and slot tabs', () => {
    render(
      <VolunteerStaffingTargetsModal
        isOpen={true}
        onClose={onCloseMock}
        targets={defaultTargets}
        onSaveTargets={onSaveMock}
      />,
    );

    expect(screen.getByText(/Configure Volunteer Targets & Thresholds/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Role Quotas' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Turnup Thresholds' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '9:00 AM' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '12:00 NN' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '3:00 PM' })).toBeInTheDocument();
    expect(screen.getByLabelText('Usher')).toHaveValue('15');
    expect(screen.getByLabelText('Backroom Support')).toHaveValue('10');
    expect(screen.getByLabelText('Prayer Coach')).toHaveValue('50');
  });

  it('allows editing values for specific slot and switching slots', () => {
    render(
      <VolunteerStaffingTargetsModal
        isOpen={true}
        onClose={onCloseMock}
        targets={defaultTargets}
        onSaveTargets={onSaveMock}
        initialSlot="9AM"
      />,
    );

    // Edit 9AM Usher to 30
    const usherInput9AM = screen.getByLabelText('Usher');
    fireEvent.change(usherInput9AM, { target: { value: '30' } });

    // Switch to 12NN slot
    const slot12NNTab = screen.getByRole('tab', { name: '12:00 NN' });
    fireEvent.click(slot12NNTab);

    // 12NN Usher should still be 15
    const usherInput12NN = screen.getByLabelText('Usher');
    expect(usherInput12NN).toHaveValue('15');
    fireEvent.change(usherInput12NN, { target: { value: '40' } });

    const saveBtn = screen.getByRole('button', { name: /Save Settings/i });
    fireEvent.click(saveBtn);

    expect(onSaveMock).toHaveBeenCalledWith({
      '9AM': expect.objectContaining({ Usher: 30 }),
      '12NN': expect.objectContaining({ Usher: 40 }),
      '3PM': expect.objectContaining({ Usher: 15 }),
    });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('copies active slot values to all slots when clicking Copy to all slots', () => {
    render(
      <VolunteerStaffingTargetsModal
        isOpen={true}
        onClose={onCloseMock}
        targets={defaultTargets}
        onSaveTargets={onSaveMock}
        initialSlot="9AM"
      />,
    );

    const usherInput = screen.getByLabelText('Usher');
    fireEvent.change(usherInput, { target: { value: '35' } });

    const copyBtn = screen.getByRole('button', { name: /Copy to all slots/i });
    fireEvent.click(copyBtn);

    // Switch to 3PM slot and check that Usher is now 35
    fireEvent.click(screen.getByRole('tab', { name: '3:00 PM' }));
    expect(screen.getByLabelText('Usher')).toHaveValue('35');
  });

  it('resets to defaults when clicking reset button', () => {
    render(
      <VolunteerStaffingTargetsModal
        isOpen={true}
        onClose={onCloseMock}
        targets={{
          '9AM': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS, Usher: 100 },
          '12NN': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS },
          '3PM': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS },
        }}
        onSaveTargets={onSaveMock}
      />,
    );

    expect(screen.getByLabelText('Usher')).toHaveValue('100');

    const resetBtn = screen.getByRole('button', { name: /Reset Quotas/i });
    fireEvent.click(resetBtn);

    expect(screen.getByLabelText('Usher')).toHaveValue('15');
  });

  it('switches to Turnup Thresholds tab, edits thresholds, and saves them', () => {
    const onSaveThresholdsMock = vi.fn();
    render(
      <VolunteerStaffingTargetsModal
        isOpen={true}
        onClose={onCloseMock}
        targets={defaultTargets}
        onSaveTargets={onSaveMock}
        onSaveThresholds={onSaveThresholdsMock}
      />,
    );

    // Switch to Turnup Thresholds tab
    fireEvent.click(screen.getByRole('tab', { name: 'Turnup Thresholds' }));

    expect(screen.getByLabelText(/Solid Tier Minimum Turnup/i)).toHaveValue('70');
    expect(screen.getByLabelText(/Moderate Tier Minimum Turnup/i)).toHaveValue('40');
    expect(screen.getByLabelText(/New \/ Unranked Member Baseline Turnup/i)).toHaveValue('80');

    // Change Solid to 75, Moderate to 45, Baseline to 85
    fireEvent.change(screen.getByLabelText(/Solid Tier Minimum Turnup/i), {
      target: { value: '75' },
    });
    fireEvent.change(screen.getByLabelText(/Moderate Tier Minimum Turnup/i), {
      target: { value: '45' },
    });
    fireEvent.change(screen.getByLabelText(/New \/ Unranked Member Baseline Turnup/i), {
      target: { value: '85' },
    });

    const saveBtn = screen.getByRole('button', { name: /Save Settings/i });
    fireEvent.click(saveBtn);

    expect(onSaveThresholdsMock).toHaveBeenCalledWith({
      solid: 0.75,
      moderate: 0.45,
      defaultTurnupRate: 0.85,
    });
  });

  it('resets thresholds to default values when on thresholds tab', () => {
    render(
      <VolunteerStaffingTargetsModal
        isOpen={true}
        onClose={onCloseMock}
        targets={defaultTargets}
        onSaveTargets={onSaveMock}
        thresholds={{ solid: 0.8, moderate: 0.5, defaultTurnupRate: 0.9 }}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Turnup Thresholds' }));
    expect(screen.getByLabelText(/Solid Tier Minimum Turnup/i)).toHaveValue('80');

    fireEvent.click(screen.getByRole('button', { name: /Reset Thresholds/i }));
    expect(screen.getByLabelText(/Solid Tier Minimum Turnup/i)).toHaveValue('70');
    expect(screen.getByLabelText(/Moderate Tier Minimum Turnup/i)).toHaveValue('40');
    expect(screen.getByLabelText(/New \/ Unranked Member Baseline Turnup/i)).toHaveValue('80');
  });
});
