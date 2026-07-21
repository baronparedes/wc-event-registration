import type { ComponentProps } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AttendeeViewConfig, DynamicFieldOption } from '@/lib/domain/attendance-views';
import { AttendanceViewControls } from '@/pages/admin/events/[id]/attendance/data/components/AttendanceViewControls';

function makeOption(
  source: DynamicFieldOption['source'],
  fieldKey: string,
  label: string,
  fieldType?: DynamicFieldOption['fieldType'],
): DynamicFieldOption {
  return {
    source,
    fieldKey,
    label,
    sortOrder: 0,
    fieldType,
    token: `${source}:${fieldKey}`,
    values: [],
  };
}

const registrationOption = makeOption('registration', 'service', 'Service', 'date');
const registrationTeamOption = makeOption('registration', 'team', 'Team');
const attendanceOption = makeOption('attendance', 'area', 'Area', 'datetime');

const baseViewConfig: AttendeeViewConfig = {
  nameOrMemberQuery: '',
  role: [],
  category: 'all',
  checkInStatus: 'all',
  groupSort: 'label_asc',
  dynamicFilters: [],
  groupBy: [],
  visibleFields: [],
};

function renderControls(overrides?: Partial<ComponentProps<typeof AttendanceViewControls>>) {
  const handlers = {
    onNameOrMemberQueryChange: vi.fn(),
    onRoleChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onCheckInStatusChange: vi.fn(),
    onGroupSortChange: vi.fn(),
    onAddGroupingLevel: vi.fn(),
    onGroupingFieldChange: vi.fn(),
    onMoveGroupingLevel: vi.fn(),
    onRemoveGroupingLevel: vi.fn(),
    onClearViewControls: vi.fn(),
    onDynamicFilterFieldTokenChange: vi.fn(),
    onDynamicFilterValueChange: vi.fn(),
    onApplyDynamicFilter: vi.fn(),
    onRemoveDynamicFilter: vi.fn(),
    onToggleVisibleField: vi.fn(),
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
      dynamicFilterFieldType={null}
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

    // Expand filters to access hidden fields
    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    fireEvent.click(screen.getByRole('button', { name: 'Role' }));
    fireEvent.click(screen.getByLabelText('Volunteer'));
    fireEvent.click(screen.getByLabelText('Member'));
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Youth' } });
    fireEvent.change(screen.getByLabelText('Check-in status'), {
      target: { value: 'checked_in' },
    });
    fireEvent.change(screen.getByLabelText('Group order'), {
      target: { value: 'time_asc' },
    });

    expect(handlers.onNameOrMemberQueryChange).toHaveBeenCalledWith('MID-42');
    expect(handlers.onRoleChange).toHaveBeenNthCalledWith(1, ['Volunteer']);
    expect(handlers.onRoleChange).toHaveBeenNthCalledWith(2, ['Member']);
    expect(handlers.onCategoryChange).toHaveBeenCalledWith('Youth');
    expect(handlers.onCheckInStatusChange).toHaveBeenCalledWith('checked_in');
    expect(handlers.onGroupSortChange).toHaveBeenCalledWith('time_asc');

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

    // Expand filters to access hidden controls
    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

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

    // Expand filters to access hidden controls
    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    fireEvent.change(screen.getByLabelText('Filter field'), {
      target: { value: 'attendance:area' },
    });
    fireEvent.change(screen.getByLabelText('Field value'), { target: { value: 'East' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply field filter' }));

    expect(handlers.onDynamicFilterFieldTokenChange).toHaveBeenCalledWith('attendance:area');
    expect(handlers.onDynamicFilterValueChange).toHaveBeenCalledWith('East');
    expect(handlers.onApplyDynamicFilter).toHaveBeenCalledTimes(1);
  });

  it('toggles displayed field checkboxes from registration and attendance groups', () => {
    const handlers = renderControls({ hasActiveFilters: true });

    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    fireEvent.click(screen.getByLabelText('Service'));
    fireEvent.click(screen.getByLabelText('Area'));

    expect(handlers.onToggleVisibleField).toHaveBeenNthCalledWith(1, 'registration:service');
    expect(handlers.onToggleVisibleField).toHaveBeenNthCalledWith(2, 'attendance:area');
  });

  it('shows preset hint when selected filter field type is date/datetime', () => {
    renderControls({
      dynamicFilterFieldToken: 'registration:service',
      dynamicFilterFieldLabel: 'Service',
      dynamicFilterFieldType: 'date',
      hasActiveFilters: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    expect(
      screen.getByText(
        'Tip: You can use date presets like UPCOMING_SUNDAY, MONTH_JULY, YEAR_MONTH_2026_JULY, YEAR_2026, or PREVIOUS_3_WEEKS.',
      ),
    ).toBeInTheDocument();
  });

  it('hides preset hint for non-date fields', () => {
    renderControls({
      dynamicFilterFieldToken: 'registration:team',
      dynamicFilterFieldLabel: 'Team',
      dynamicFilterFieldType: 'text',
      hasActiveFilters: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    expect(
      screen.queryByText(
        'Tip: You can use date presets like UPCOMING_SUNDAY, MONTH_JULY, YEAR_MONTH_2026_JULY, YEAR_2026, or PREVIOUS_3_WEEKS.',
      ),
    ).not.toBeInTheDocument();
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

    // Expand filters to access the filter controls section
    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    const chip = screen.getByRole('button', { name: 'Area (attendance): North x' });
    fireEvent.click(chip);

    expect(handlers.onRemoveDynamicFilter).toHaveBeenCalledWith('attendance:area', 'North');
  });

  it('shows empty grouping copy when no grouping exists', () => {
    renderControls({ viewConfig: { ...baseViewConfig, groupBy: [] } });

    // Expand filters to access the grouping section
    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    expect(screen.getByText('No grouping applied.')).toBeInTheDocument();
  });

  it('closes the role dropdown on outside click and Escape key', () => {
    renderControls({ hasActiveFilters: true });

    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Role' }));

    expect(screen.getByLabelText('Role options')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByLabelText('Role options')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Role' }));
    expect(screen.getByLabelText('Role options')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByLabelText('Role options')).not.toBeInTheDocument();
  });

  it('closes the role dropdown when All roles is clicked', () => {
    const handlers = renderControls({
      hasActiveFilters: true,
      viewConfig: { ...baseViewConfig, role: ['Member'] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Role' }));

    fireEvent.click(screen.getByRole('button', { name: 'All roles' }));

    expect(handlers.onRoleChange).toHaveBeenCalledWith([]);
    expect(screen.queryByLabelText('Role options')).not.toBeInTheDocument();
  });
});
