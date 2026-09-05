import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AttendeeViewConfig } from '@/lib/domain/attendance-views';

import { AttendanceViewControls } from '../AttendanceViewControls';

const defaultViewConfig: AttendeeViewConfig = {
  nameOrMemberQuery: '',
  role: [],
  category: 'all',
  checkInStatus: 'all',
  dynamicFilterCombination: 'and',
  dynamicFilters: [],
  groupBy: [],
  visibleFields: [],
};

describe('AttendanceViewControls', () => {
  it('renders grouping levels and handles level operations', () => {
    const onAddGroupingLevel = vi.fn();
    const onGroupingFieldChange = vi.fn();
    const onGroupingSortChange = vi.fn();
    const onMoveGroupingLevel = vi.fn();
    const onRemoveGroupingLevel = vi.fn();

    render(
      <AttendanceViewControls
        viewConfig={{
          ...defaultViewConfig,
          groupBy: [
            { source: 'role', fieldKey: 'role', label: 'Role', groupSort: 'size_desc' },
            { source: 'category', fieldKey: 'category', label: 'Category', groupSort: 'label_asc' },
          ],
        }}
        canClearFilters={false}
        roleOptions={[]}
        categoryOptions={[]}
        dynamicFieldOptions={[
          {
            source: 'registration',
            fieldKey: 'service',
            label: 'Service',
            token: 'registration:service',
            values: [],
          },
          {
            source: 'attendance',
            fieldKey: 'area',
            label: 'Area',
            token: 'attendance:area',
            values: [],
          },
        ]}
        registrationDynamicFieldOptions={[
          {
            source: 'registration',
            fieldKey: 'service',
            label: 'Service',
            token: 'registration:service',
            values: [],
          },
        ]}
        attendanceDynamicFieldOptions={[
          {
            source: 'attendance',
            fieldKey: 'area',
            label: 'Area',
            token: 'attendance:area',
            values: [],
          },
        ]}
        memberDynamicFieldOptions={[]}
        dynamicFilterFieldToken=""
        dynamicFilterValue=""
        dynamicFilterCombination="and"
        dynamicFilterFieldLabel={null}
        onNameOrMemberQueryChange={vi.fn()}
        onRoleChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onCheckInStatusChange={vi.fn()}
        onAddGroupingLevel={onAddGroupingLevel}
        onGroupingFieldChange={onGroupingFieldChange}
        onGroupingSortChange={onGroupingSortChange}
        onMoveGroupingLevel={onMoveGroupingLevel}
        onRemoveGroupingLevel={onRemoveGroupingLevel}
        onClearViewControls={vi.fn()}
        onDynamicFilterFieldTokenChange={vi.fn()}
        onDynamicFilterValueChange={vi.fn()}
        onDynamicFilterCombinationChange={vi.fn()}
        onApplyDynamicFilter={vi.fn()}
        onApplyCustomFilterJson={vi.fn().mockReturnValue({ ok: true })}
        onRemoveDynamicFilter={vi.fn()}
        onToggleVisibleField={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    const addLevelBtn = screen.getByRole('button', { name: 'Add group level' });
    fireEvent.click(addLevelBtn);
    expect(onAddGroupingLevel).toHaveBeenCalled();

    const level1Select = screen.getByLabelText('Level 1 field');
    fireEvent.click(level1Select);

    const moveDownBtn = screen.getByRole('button', { name: 'Move level 1 down' });
    fireEvent.click(moveDownBtn);
    expect(onMoveGroupingLevel).toHaveBeenCalledWith(0, 'down');

    const removeBtn = screen.getByRole('button', { name: 'Remove level 1' });
    fireEvent.click(removeBtn);
    expect(onRemoveGroupingLevel).toHaveBeenCalledWith(0);
  });

  it('renders primary filters and handles collapsible section toggle', () => {
    const onNameChange = vi.fn();
    const onClear = vi.fn();

    render(
      <AttendanceViewControls
        viewConfig={defaultViewConfig}
        canClearFilters={true}
        roleOptions={['Volunteer', 'Leader']}
        categoryOptions={['Youth', 'Adult']}
        dynamicFieldOptions={[]}
        registrationDynamicFieldOptions={[]}
        attendanceDynamicFieldOptions={[]}
        memberDynamicFieldOptions={[]}
        dynamicFilterFieldToken=""
        dynamicFilterValue=""
        dynamicFilterCombination="and"
        dynamicFilterFieldLabel={null}
        onNameOrMemberQueryChange={onNameChange}
        onRoleChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onCheckInStatusChange={vi.fn()}
        onAddGroupingLevel={vi.fn()}
        onGroupingFieldChange={vi.fn()}
        onGroupingSortChange={vi.fn()}
        onMoveGroupingLevel={vi.fn()}
        onRemoveGroupingLevel={vi.fn()}
        onClearViewControls={onClear}
        onDynamicFilterFieldTokenChange={vi.fn()}
        onDynamicFilterValueChange={vi.fn()}
        onDynamicFilterCombinationChange={vi.fn()}
        onApplyDynamicFilter={vi.fn()}
        onApplyCustomFilterJson={vi.fn().mockReturnValue({ ok: true })}
        onRemoveDynamicFilter={vi.fn()}
        onToggleVisibleField={vi.fn()}
      />,
    );

    expect(screen.getByText('FILTERS & GROUPINGS')).toBeInTheDocument();

    const expandBtn = screen.getByRole('button', { name: 'Expand filters' });
    fireEvent.click(expandBtn);

    expect(screen.getByRole('button', { name: 'Collapse filters' })).toBeInTheDocument();
  });

  it('handles role selection dropdown and custom JSON filter apply', () => {
    const onRoleChange = vi.fn();
    const onApplyCustomFilterJson = vi
      .fn()
      .mockReturnValueOnce({ ok: false, error: 'Bad JSON' })
      .mockReturnValueOnce({ ok: true });

    render(
      <AttendanceViewControls
        viewConfig={{ ...defaultViewConfig, role: ['Volunteer'] }}
        canClearFilters={false}
        roleOptions={['Volunteer', 'Leader']}
        categoryOptions={['Youth', 'Adult']}
        dynamicFieldOptions={[]}
        registrationDynamicFieldOptions={[]}
        attendanceDynamicFieldOptions={[]}
        memberDynamicFieldOptions={[]}
        dynamicFilterFieldToken=""
        dynamicFilterValue=""
        dynamicFilterCombination="and"
        dynamicFilterFieldLabel={null}
        onNameOrMemberQueryChange={vi.fn()}
        onRoleChange={onRoleChange}
        onCategoryChange={vi.fn()}
        onCheckInStatusChange={vi.fn()}
        onAddGroupingLevel={vi.fn()}
        onGroupingFieldChange={vi.fn()}
        onGroupingSortChange={vi.fn()}
        onMoveGroupingLevel={vi.fn()}
        onRemoveGroupingLevel={vi.fn()}
        onClearViewControls={vi.fn()}
        onDynamicFilterFieldTokenChange={vi.fn()}
        onDynamicFilterValueChange={vi.fn()}
        onDynamicFilterCombinationChange={vi.fn()}
        onApplyDynamicFilter={vi.fn()}
        onApplyCustomFilterJson={onApplyCustomFilterJson}
        onRemoveDynamicFilter={vi.fn()}
        onToggleVisibleField={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    // Role dropdown
    const roleDropdownBtn = screen.getByRole('button', { name: 'Role' });
    fireEvent.click(roleDropdownBtn);

    const leaderCheckbox = screen.getByLabelText('Leader');
    fireEvent.click(leaderCheckbox);
    expect(onRoleChange).toHaveBeenCalledWith(['Volunteer', 'Leader']);

    // Clear role selection button
    const clearRolesBtn = screen.getByRole('button', { name: 'All roles' });
    fireEvent.click(clearRolesBtn);
    expect(onRoleChange).toHaveBeenCalledWith([]);

    // Escape closes role dropdown
    fireEvent.keyDown(document, { key: 'Escape' });

    // Category selection
    const categorySelect = screen.getByLabelText('Category');
    fireEvent.change(categorySelect, { target: { value: 'Youth' } });

    // Check-in status selection
    const statusSelect = screen.getByLabelText('Check-in status');
    fireEvent.change(statusSelect, { target: { value: 'checked_in' } });
  });
});
