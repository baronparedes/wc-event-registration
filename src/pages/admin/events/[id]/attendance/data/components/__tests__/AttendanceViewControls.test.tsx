import type { ComponentProps } from 'react';

import { fireEvent, render, screen, within } from '@testing-library/react';
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
const memberOption = makeOption('member', 'email', 'Email');
const memberAvatarOption = makeOption('member', 'avatar', 'Avatar');

const baseViewConfig: AttendeeViewConfig = {
  nameOrMemberQuery: '',
  role: [],
  category: 'all',
  checkInStatus: 'all',
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
    onAddGroupingLevel: vi.fn(),
    onGroupingFieldChange: vi.fn(),
    onGroupingSortChange: vi.fn(),
    onMoveGroupingLevel: vi.fn(),
    onRemoveGroupingLevel: vi.fn(),
    onClearViewControls: vi.fn(),
    onDynamicFilterFieldTokenChange: vi.fn(),
    onDynamicFilterValueChange: vi.fn(),
    onDynamicFilterCombinationChange: vi.fn(),
    onApplyDynamicFilter: vi.fn(),
    onApplyCustomFilterJson: vi.fn(() => ({ ok: true as const })),
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
      memberDynamicFieldOptions={[memberOption, memberAvatarOption]}
      dynamicFilterFieldToken=""
      dynamicFilterValue=""
      dynamicFilterCombination="and"
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

    fireEvent.click(screen.getByRole('button', { name: 'Role' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Volunteer' }));

    // Re-open Role dropdown to select Member
    fireEvent.click(screen.getByRole('button', { name: 'Role' }));
    fireEvent.click(screen.getByRole('button', { name: 'Role' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Member' }));

    fireEvent.click(screen.getByRole('button', { name: 'Category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Youth' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check-in status' }));
    fireEvent.click(screen.getByRole('option', { name: 'Checked in' }));
    expect(handlers.onNameOrMemberQueryChange).toHaveBeenCalledWith('MID-42');
    expect(handlers.onRoleChange).toHaveBeenNthCalledWith(1, ['Volunteer']);
    expect(handlers.onRoleChange).toHaveBeenNthCalledWith(2, ['Member']);
    expect(handlers.onCategoryChange).toHaveBeenCalledWith('Youth');
    expect(handlers.onCheckInStatusChange).toHaveBeenCalledWith('checked_in');

    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    expect(screen.getByRole('button', { name: 'Apply field filter' })).toBeDisabled();
  });

  it('renders grouping controls and calls grouping handlers for level actions', () => {
    const handlers = renderControls({
      hasActiveFilters: true,
      viewConfig: {
        ...baseViewConfig,
        groupBy: [
          { source: 'registration', fieldKey: 'service', label: 'Service', groupSort: 'label_asc' },
          { source: 'attendance', fieldKey: 'area', label: 'Area', groupSort: 'label_asc' },
        ],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    fireEvent.click(screen.getByRole('button', { name: 'Add group level' }));
    expect(handlers.onAddGroupingLevel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Level 1 field' }));
    fireEvent.click(screen.getByRole('option', { name: 'Team' }));
    expect(handlers.onGroupingFieldChange).toHaveBeenCalledWith(0, 'registration:team');

    fireEvent.click(screen.getByRole('button', { name: 'Level 1 order' }));
    fireEvent.click(screen.getByRole('option', { name: 'Earliest' }));
    expect(handlers.onGroupingSortChange).toHaveBeenCalledWith(0, 'time_asc');

    const level2OrderButton = screen.getByRole('button', { name: 'Level 2 order' });
    expect(level2OrderButton).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Move level 2 up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move level 1 down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove level 1' }));

    expect(handlers.onMoveGroupingLevel).toHaveBeenCalledWith(1, 'up');
    expect(handlers.onMoveGroupingLevel).toHaveBeenCalledWith(0, 'down');
    expect(handlers.onRemoveGroupingLevel).toHaveBeenCalledWith(0);
  });

  it('supports filter field/value interactions and apply action when value is present', () => {
    const handlers = renderControls({
      dynamicFilterFieldToken: 'registration:service',
      dynamicFilterFieldLabel: 'Service',
      dynamicFilterValue: '9AM',
      hasActiveFilters: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    fireEvent.click(screen.getByRole('button', { name: 'Filter field' }));
    fireEvent.click(screen.getByRole('option', { name: 'Area' }));

    // Open Field-Based Conditions dropdown and select OR
    fireEvent.click(screen.getByRole('button', { name: 'Field-Based Conditions' }));
    fireEvent.click(screen.getByRole('option', { name: 'Any filter can match (OR)' }));

    fireEvent.change(screen.getByLabelText('Field value'), { target: { value: 'East' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply field filter' }));

    expect(handlers.onDynamicFilterFieldTokenChange).toHaveBeenCalledWith('attendance:area');
    expect(handlers.onDynamicFilterCombinationChange).toHaveBeenCalledWith('or');
    expect(handlers.onDynamicFilterValueChange).toHaveBeenCalledWith('East');
    expect(handlers.onApplyDynamicFilter).toHaveBeenCalledTimes(1);
  });

  it('applies custom JSON filter text and surfaces callback errors', () => {
    const customJsonHandler = vi
      .fn()
      .mockReturnValueOnce({ ok: false as const, error: 'Invalid payload.' })
      .mockReturnValueOnce({ ok: true as const });

    renderControls({
      hasActiveFilters: true,
      onApplyCustomFilterJson: customJsonHandler,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Custom JSON Filter' }));

    const applyCustomJsonButton = screen.getByRole('button', { name: 'Apply custom JSON filter' });
    const customJsonContainer = applyCustomJsonButton.closest('div')?.parentElement;
    expect(customJsonContainer).not.toBeNull();

    fireEvent.change(within(customJsonContainer as HTMLElement).getByRole('textbox'), {
      target: {
        value:
          '{"dynamicFilterCombination":"and","filters":[{"token":"attendance:area","value":"North"}]}',
      },
    });

    fireEvent.click(applyCustomJsonButton);
    expect(customJsonHandler).toHaveBeenCalledWith(
      '{"dynamicFilterCombination":"and","filters":[{"token":"attendance:area","value":"North"}]}',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid payload.');

    fireEvent.click(screen.getByRole('button', { name: 'Apply custom JSON filter' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('toggles displayed field checkboxes from registration, attendance, and member groups', () => {
    const handlers = renderControls({ hasActiveFilters: true });

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));

    fireEvent.click(screen.getByLabelText('Service'));
    fireEvent.click(screen.getByLabelText('Area'));
    fireEvent.click(screen.getByLabelText('Email'));
    fireEvent.click(screen.getByLabelText('Avatar'));

    expect(handlers.onToggleVisibleField).toHaveBeenNthCalledWith(1, 'registration:service');
    expect(handlers.onToggleVisibleField).toHaveBeenNthCalledWith(2, 'attendance:area');
    expect(handlers.onToggleVisibleField).toHaveBeenNthCalledWith(3, 'member:email');
    expect(handlers.onToggleVisibleField).toHaveBeenNthCalledWith(4, 'member:avatar');
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

    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    expect(screen.getByText('No grouping applied.')).toBeInTheDocument();
  });

  it('closes the role dropdown on outside click and Escape key', () => {
    renderControls({ hasActiveFilters: true });

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

    fireEvent.click(screen.getByRole('button', { name: 'Role' }));

    fireEvent.click(screen.getByRole('button', { name: 'All roles' }));

    expect(handlers.onRoleChange).toHaveBeenCalledWith([]);
    expect(screen.queryByLabelText('Role options')).not.toBeInTheDocument();
  });

  it('shows advanced rules indicator count when grouping or dynamic filters are active', () => {
    renderControls({
      viewConfig: {
        ...baseViewConfig,
        groupBy: [
          { source: 'registration', fieldKey: 'service', label: 'Service', groupSort: 'label_asc' },
        ],
        dynamicFilters: [
          {
            field: { source: 'attendance', fieldKey: 'area', label: 'Area' },
            value: 'North',
          },
        ],
      },
    });

    const heading = screen.getByText('Advanced filtering & rules').parentElement;
    expect(heading).not.toBeNull();
    expect(within(heading as HTMLElement).getByText('2')).toBeInTheDocument();
  });

  it('hides advanced rules indicator count when no advanced criteria are active', () => {
    renderControls({ viewConfig: { ...baseViewConfig, groupBy: [], dynamicFilters: [] } });

    const heading = screen.getByText('Advanced filtering & rules').parentElement;
    expect(heading).not.toBeNull();
    expect(within(heading as HTMLElement).queryByText(/^\d+$/)).not.toBeInTheDocument();
  });
});
