import type { ComponentProps } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AttendeeViewConfig, DynamicFieldOption } from '@/lib/domain/attendance-views';
import { AttendanceViewControls } from '@/pages/admin/events/[id]/attendance/data/components/AttendanceViewControls';

function makeOption(
  source: DynamicFieldOption['source'],
  fieldKey: string,
  label: string,
): DynamicFieldOption {
  return {
    source,
    fieldKey,
    label,
    sortOrder: 0,
    token: `${source}:${fieldKey}`,
    values: [],
  };
}

const registrationOption = makeOption('registration', 'service', 'Service');
const registrationTeamOption = makeOption('registration', 'team', 'Team');
const attendanceOption = makeOption('attendance', 'area', 'Area');

const baseViewConfig: AttendeeViewConfig = {
  nameOrMemberQuery: '',
  role: 'all',
  category: 'all',
  checkInStatus: 'all',
  dynamicFilters: [],
  groupBy: [],
};

function renderControls(overrides?: Partial<ComponentProps<typeof AttendanceViewControls>>) {
  const handlers = {
    onNameOrMemberQueryChange: vi.fn(),
    onRoleChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onCheckInStatusChange: vi.fn(),
    onAddGroupingLevel: vi.fn(),
    onGroupingFieldChange: vi.fn(),
    onMoveGroupingLevel: vi.fn(),
    onRemoveGroupingLevel: vi.fn(),
    onClearViewControls: vi.fn(),
    onDynamicFilterFieldTokenChange: vi.fn(),
    onDynamicFilterValueChange: vi.fn(),
    onApplyDynamicFilter: vi.fn(),
    onRemoveDynamicFilter: vi.fn(),
  };

  render(
    <AttendanceViewControls
      viewConfig={baseViewConfig}
      hasActiveFilters={false}
      roleOptions={['Member', 'Volunteer']}
      categoryOptions={['Adult', 'Youth']}
      dynamicFieldOptions={[registrationOption, registrationTeamOption, attendanceOption]}
      registrationDynamicFieldOptions={[registrationOption, registrationTeamOption]}
      attendanceDynamicFieldOptions={[attendanceOption]}
      dynamicFilterFieldToken=""
      dynamicFilterValue=""
      dynamicFilterFieldLabel={null}
      {...handlers}
      {...overrides}
    />,
  );

  return handlers;
}

describe('AttendanceViewControls', () => {
  it('calls basic filter callbacks and keeps clear/apply buttons disabled by default', () => {
    const handlers = renderControls();

    fireEvent.change(screen.getByLabelText('Name or Member ID'), { target: { value: 'MID-42' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Volunteer' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Youth' } });
    fireEvent.change(screen.getByLabelText('Check-in status'), {
      target: { value: 'checked_in' },
    });

    expect(handlers.onNameOrMemberQueryChange).toHaveBeenCalledWith('MID-42');
    expect(handlers.onRoleChange).toHaveBeenCalledWith('Volunteer');
    expect(handlers.onCategoryChange).toHaveBeenCalledWith('Youth');
    expect(handlers.onCheckInStatusChange).toHaveBeenCalledWith('checked_in');

    expect(screen.getByRole('button', { name: 'Clear view controls' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply field filter' })).toBeDisabled();
  });

  it('renders grouping controls and calls grouping handlers for level actions', () => {
    const handlers = renderControls({
      hasActiveFilters: true,
      viewConfig: {
        ...baseViewConfig,
        groupBy: [
          { source: 'registration', fieldKey: 'service', label: 'Service' },
          { source: 'attendance', fieldKey: 'area', label: 'Area' },
        ],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add group level' }));
    expect(handlers.onAddGroupingLevel).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getAllByRole('combobox')[3], {
      target: { value: 'registration:team' },
    });
    expect(handlers.onGroupingFieldChange).toHaveBeenCalledWith(0, 'registration:team');

    fireEvent.click(screen.getAllByRole('button', { name: 'Up' })[1]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Down' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    expect(handlers.onMoveGroupingLevel).toHaveBeenCalledWith(1, 'up');
    expect(handlers.onMoveGroupingLevel).toHaveBeenCalledWith(0, 'down');
    expect(handlers.onRemoveGroupingLevel).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole('button', { name: 'Clear view controls' }));
    expect(handlers.onClearViewControls).toHaveBeenCalledTimes(1);
  });

  it('supports filter field/value interactions and apply action when value is present', () => {
    const handlers = renderControls({
      dynamicFilterFieldToken: 'registration:service',
      dynamicFilterFieldLabel: 'Service',
      dynamicFilterValue: '9AM',
      hasActiveFilters: true,
    });

    fireEvent.change(screen.getByLabelText('Filter field'), {
      target: { value: 'attendance:area' },
    });
    fireEvent.change(screen.getByLabelText('Field value'), { target: { value: 'East' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply field filter' }));

    expect(handlers.onDynamicFilterFieldTokenChange).toHaveBeenCalledWith('attendance:area');
    expect(handlers.onDynamicFilterValueChange).toHaveBeenCalledWith('East');
    expect(handlers.onApplyDynamicFilter).toHaveBeenCalledTimes(1);
  });

  it('renders dynamic filter chips and removes chip by token and value', () => {
    const handlers = renderControls({
      viewConfig: {
        ...baseViewConfig,
        dynamicFilters: [
          {
            field: { source: 'attendance', fieldKey: 'area', label: 'Area' },
            value: 'North',
          },
        ],
      },
      hasActiveFilters: true,
    });

    const chip = screen.getByRole('button', { name: 'Area (attendance): North x' });
    fireEvent.click(chip);

    expect(handlers.onRemoveDynamicFilter).toHaveBeenCalledWith('attendance:area', 'North');
  });

  it('shows empty grouping copy when no grouping exists', () => {
    renderControls({ viewConfig: { ...baseViewConfig, groupBy: [] } });

    expect(screen.getByText('No grouping applied.')).toBeInTheDocument();
  });
});
