import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { DynamicFieldOption } from '@/lib/domain/attendance-views';

import { useAttendanceViewControlsState } from '../useAttendanceViewControlsState';

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

const serviceOption = makeOption('registration', 'service', 'Service');
const teamOption = makeOption('registration', 'team', 'Team');
const areaOption = makeOption('attendance', 'area', 'Area');

describe('useAttendanceViewControlsState', () => {
  it('initializes default state and updates base filters', () => {
    const { result } = renderHook(() =>
      useAttendanceViewControlsState([serviceOption, teamOption, areaOption]),
    );

    expect(result.current.viewConfig.nameOrMemberQuery).toBe('');
    expect(result.current.viewConfig.role).toEqual([]);
    expect(result.current.viewConfig.category).toBe('all');
    expect(result.current.viewConfig.checkInStatus).toBe('all');
    expect(result.current.viewConfig.visibleFields).toEqual([]);
    expect(result.current.dynamicFilterField).toBeNull();
    expect(result.current.hasActiveFilters).toBe(false);

    act(() => {
      result.current.setNameOrMemberQuery('MID-001');
      result.current.setRole(['Volunteer']);
      result.current.setCategory('Youth');
      result.current.setCheckInStatus('checked_in');
    });

    expect(result.current.viewConfig.nameOrMemberQuery).toBe('MID-001');
    expect(result.current.viewConfig.role).toEqual(['Volunteer']);
    expect(result.current.viewConfig.category).toBe('Youth');
    expect(result.current.viewConfig.checkInStatus).toBe('checked_in');
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('handles adding same-field filter values and removing a single filter chip', () => {
    const { result } = renderHook(() =>
      useAttendanceViewControlsState([serviceOption, teamOption, areaOption]),
    );

    act(() => {
      result.current.setFilterFieldToken('registration:service');
    });

    act(() => {
      result.current.setDynamicFilterValue('  9AM  ');
    });

    act(() => {
      result.current.addDynamicFilter();
    });

    expect(result.current.viewConfig.dynamicFilters).toHaveLength(1);
    expect(result.current.viewConfig.dynamicFilters[0].field).toMatchObject({
      source: 'registration',
      fieldKey: 'service',
      label: 'Service',
      sortOrder: 0,
    });
    expect(result.current.viewConfig.dynamicFilters[0].value).toBe('9AM');
    expect(result.current.dynamicFilterValue).toBe('');

    act(() => {
      result.current.setDynamicFilterValue('11AM');
    });

    act(() => {
      result.current.addDynamicFilter();
    });

    expect(result.current.viewConfig.dynamicFilters).toHaveLength(2);
    expect(result.current.viewConfig.dynamicFilters.map((filter) => filter.value)).toEqual([
      '9AM',
      '11AM',
    ]);

    act(() => {
      result.current.removeDynamicFilter('registration:service', '9AM');
    });

    expect(result.current.viewConfig.dynamicFilters).toHaveLength(1);
    expect(result.current.viewConfig.dynamicFilters[0]).toMatchObject({
      field: {
        source: 'registration',
        fieldKey: 'service',
        label: 'Service',
        sortOrder: 0,
      },
      value: '11AM',
    });

    act(() => {
      result.current.removeDynamicFilter('registration:service');
    });

    expect(result.current.viewConfig.dynamicFilters).toEqual([]);
  });

  it('guards addDynamicFilter when token is unknown or value is empty', () => {
    const { result } = renderHook(() => useAttendanceViewControlsState([serviceOption]));

    act(() => {
      result.current.setFilterFieldToken('unknown:field');
    });

    act(() => {
      result.current.setDynamicFilterValue('something');
    });

    act(() => {
      result.current.addDynamicFilter();
    });

    expect(result.current.viewConfig.dynamicFilters).toHaveLength(0);

    act(() => {
      result.current.setFilterFieldToken('registration:service');
    });

    act(() => {
      result.current.setDynamicFilterValue('   ');
    });

    act(() => {
      result.current.addDynamicFilter();
    });

    expect(result.current.viewConfig.dynamicFilters).toHaveLength(0);
  });

  it('supports OR-style values on the same field while retaining other field filters', () => {
    const { result } = renderHook(() =>
      useAttendanceViewControlsState([serviceOption, teamOption, areaOption]),
    );

    act(() => {
      result.current.setFilterFieldToken('registration:service');
    });
    act(() => {
      result.current.setDynamicFilterValue('9AM');
    });
    act(() => {
      result.current.addDynamicFilter();
    });

    act(() => {
      result.current.setFilterFieldToken('registration:team');
    });
    act(() => {
      result.current.setDynamicFilterValue('Blue');
    });
    act(() => {
      result.current.addDynamicFilter();
    });

    act(() => {
      result.current.setFilterFieldToken('registration:service');
    });
    act(() => {
      result.current.setDynamicFilterValue('11AM');
    });
    act(() => {
      result.current.addDynamicFilter();
    });

    expect(result.current.viewConfig.dynamicFilters).toHaveLength(3);
    expect(result.current.viewConfig.dynamicFilters[0].field.fieldKey).toBe('service');
    expect(result.current.viewConfig.dynamicFilters[0].value).toBe('9AM');
    expect(result.current.viewConfig.dynamicFilters[1].field.fieldKey).toBe('team');
    expect(result.current.viewConfig.dynamicFilters[1].value).toBe('Blue');
    expect(result.current.viewConfig.dynamicFilters[2].field.fieldKey).toBe('service');
    expect(result.current.viewConfig.dynamicFilters[2].value).toBe('11AM');
  });

  it('toggles visible fields by token and counts them as active view state', () => {
    const { result } = renderHook(() =>
      useAttendanceViewControlsState([serviceOption, teamOption, areaOption]),
    );

    act(() => {
      result.current.toggleVisibleField('registration:service');
    });

    expect(result.current.viewConfig.visibleFields).toEqual([
      { source: 'registration', fieldKey: 'service', label: 'Service', sortOrder: 0 },
    ]);
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.toggleVisibleField('registration:service');
    });

    expect(result.current.viewConfig.visibleFields).toEqual([]);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('supports grouping operations including duplicate prevention and clear on invalid token', () => {
    const { result } = renderHook(() =>
      useAttendanceViewControlsState([serviceOption, teamOption, areaOption]),
    );

    act(() => {
      result.current.addGroupingLevel();
      result.current.addGroupingLevel();
      result.current.changeGroupingField(0, 'registration:service');
      result.current.changeGroupingField(1, 'attendance:area');
    });

    expect(result.current.viewConfig.groupBy.map((field) => field.fieldKey)).toEqual([
      'service',
      'area',
    ]);

    act(() => {
      result.current.changeGroupingField(1, 'registration:service');
    });

    expect(result.current.viewConfig.groupBy.map((field) => field.fieldKey)).toEqual([
      'service',
      'area',
    ]);

    act(() => {
      result.current.changeGroupingField(1, 'unknown:token');
    });

    expect(result.current.viewConfig.groupBy[1]).toEqual({
      source: 'registration',
      fieldKey: '',
      label: '',
    });
  });

  it('moves/removes grouping levels and resets all controls', () => {
    const { result } = renderHook(() =>
      useAttendanceViewControlsState([serviceOption, teamOption, areaOption]),
    );

    act(() => {
      result.current.addGroupingLevel();
      result.current.addGroupingLevel();
      result.current.changeGroupingField(0, 'registration:service');
      result.current.changeGroupingField(1, 'attendance:area');
    });

    act(() => {
      result.current.moveGroupingLevel(0, 'down');
    });

    expect(result.current.viewConfig.groupBy.map((field) => field.fieldKey)).toEqual([
      'area',
      'service',
    ]);

    act(() => {
      result.current.moveGroupingLevel(0, 'up');
      result.current.moveGroupingLevel(1, 'down');
    });

    expect(result.current.viewConfig.groupBy.map((field) => field.fieldKey)).toEqual([
      'area',
      'service',
    ]);

    act(() => {
      result.current.removeGroupingLevel(0);
    });

    expect(result.current.viewConfig.groupBy).toHaveLength(1);

    act(() => {
      result.current.setNameOrMemberQuery('MID-123');
      result.current.setRole(['Member']);
      result.current.setFilterFieldToken('attendance:area');
      result.current.setDynamicFilterValue('West');
      result.current.clearViewControls();
    });

    expect(result.current.viewConfig).toEqual({
      nameOrMemberQuery: '',
      role: [],
      category: 'all',
      checkInStatus: 'all',
      groupSort: 'label_asc',
      dynamicFilters: [],
      groupBy: [],
      visibleFields: [],
    });
    expect(result.current.dynamicFilterFieldToken).toBe('');
    expect(result.current.dynamicFilterValue).toBe('');
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('restores full view config via applyViewConfig and resets filter controls', () => {
    const { result } = renderHook(() =>
      useAttendanceViewControlsState([serviceOption, teamOption, areaOption]),
    );

    act(() => {
      result.current.setFilterFieldToken('registration:service');
      result.current.setDynamicFilterValue('9AM');
    });

    const savedConfig = {
      nameOrMemberQuery: 'MID-001',
      role: ['Volunteer'],
      category: 'Youth',
      checkInStatus: 'checked_in' as const,
      groupSort: 'time_asc' as const,
      dynamicFilters: [
        {
          field: { source: 'attendance' as const, fieldKey: 'area', label: 'Area' },
          value: 'East',
        },
      ],
      groupBy: [{ source: 'registration' as const, fieldKey: 'service', label: 'Service' }],
      visibleFields: [{ source: 'attendance' as const, fieldKey: 'area', label: 'Area' }],
    };

    act(() => {
      result.current.applyViewConfig(savedConfig);
    });

    expect(result.current.viewConfig).toEqual(savedConfig);
    expect(result.current.dynamicFilterFieldToken).toBe('');
    expect(result.current.dynamicFilterValue).toBe('');
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('handles static role and category grouping fields', () => {
    const { result } = renderHook(() => useAttendanceViewControlsState([serviceOption]));

    act(() => {
      result.current.addGroupingLevel();
      result.current.addGroupingLevel();
      result.current.changeGroupingField(0, 'role:role');
      result.current.changeGroupingField(1, 'category:category');
    });

    expect(result.current.viewConfig.groupBy[0]).toMatchObject({
      source: 'role',
      fieldKey: 'role',
      label: 'Role',
    });
    expect(result.current.viewConfig.groupBy[1]).toMatchObject({
      source: 'category',
      fieldKey: 'category',
      label: 'Category',
    });
  });
});
