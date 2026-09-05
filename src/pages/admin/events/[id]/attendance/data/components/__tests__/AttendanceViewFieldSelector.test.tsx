import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DynamicFieldOption, DynamicFieldRef } from '@/lib/domain/attendance-views';
import { AttendanceViewFieldSelector } from '../AttendanceViewFieldSelector';

const optReg: DynamicFieldOption = {
  source: 'registration',
  fieldKey: 'f1',
  label: 'Reg Field 1',
  token: 'registration:f1',
  values: [],
};

const selected: DynamicFieldRef[] = [{ source: 'registration', fieldKey: 'f1', label: 'Reg Field 1' }];

describe('AttendanceViewFieldSelector', () => {
  it('renders field option groups and handles toggles', () => {
    const onToggle = vi.fn();

    render(
      <AttendanceViewFieldSelector
        selectedFields={selected}
        registrationFieldOptions={[optReg]}
        attendanceFieldOptions={[]}
        memberFieldOptions={[]}
        onToggleField={onToggle}
      />,
    );

    expect(screen.getByText('Registration fields')).toBeInTheDocument();
    expect(screen.getByText('No active attendance fields are available.')).toBeInTheDocument();
    expect(screen.getByText('No member fields are available.')).toBeInTheDocument();

    const checkbox = screen.getByLabelText('Reg Field 1');
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith('registration:f1');
  });
});
