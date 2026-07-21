import { useCallback, useMemo, useState } from 'react';

import {
  type AttendeeViewConfig,
  type AttendeeViewGroupSort,
  type DynamicFieldOption,
  type DynamicFilterCombination,
  attendeeViewConfigSchema,
  fromDynamicFieldToken,
  toDynamicFieldToken,
} from '@/lib/domain/attendance-views';

const DEFAULT_VIEW_CONFIG: AttendeeViewConfig = {
  nameOrMemberQuery: '',
  role: [],
  category: 'all',
  checkInStatus: 'all',
  dynamicFilterCombination: 'and',
  dynamicFilters: [],
  groupBy: [],
  visibleFields: [],
};

function normalizeGroupingSortByLevel(groupBy: AttendeeViewConfig['groupBy']) {
  return groupBy.map((field, index) => {
    const currentSort = field.groupSort ?? 'label_asc';
    const normalizedSort =
      index > 0 && (currentSort === 'size_desc' || currentSort === 'size_asc')
        ? 'label_asc'
        : currentSort;

    return {
      ...field,
      groupSort: normalizedSort,
    };
  });
}

/**
 * Manages filter and grouping UI state for admin attendance data views.
 */
export function useAttendanceViewControlsState(dynamicFieldOptions: DynamicFieldOption[]) {
  const [viewConfig, setViewConfig] = useState<AttendeeViewConfig>(DEFAULT_VIEW_CONFIG);
  const [dynamicFilterFieldToken, setDynamicFilterFieldToken] = useState('');
  const [dynamicFilterValue, setDynamicFilterValue] = useState('');

  const dynamicFilterField = useMemo(
    () => fromDynamicFieldToken(dynamicFilterFieldToken, dynamicFieldOptions),
    [dynamicFilterFieldToken, dynamicFieldOptions],
  );

  const hasActiveFilters =
    viewConfig.nameOrMemberQuery.trim().length > 0 ||
    viewConfig.role.length > 0 ||
    viewConfig.category !== 'all' ||
    viewConfig.checkInStatus !== 'all' ||
    viewConfig.dynamicFilters.length > 0 ||
    viewConfig.groupBy.length > 0 ||
    viewConfig.visibleFields.length > 0;

  function setNameOrMemberQuery(value: string) {
    setViewConfig((current) => ({ ...current, nameOrMemberQuery: value }));
  }

  function setRole(value: string[]) {
    setViewConfig((current) => ({ ...current, role: value }));
  }

  function setCategory(value: string) {
    setViewConfig((current) => ({ ...current, category: value }));
  }

  function setCheckInStatus(value: AttendeeViewConfig['checkInStatus']) {
    setViewConfig((current) => ({ ...current, checkInStatus: value }));
  }

  function setDynamicFilterCombination(value: DynamicFilterCombination) {
    setViewConfig((current) => ({
      ...current,
      dynamicFilterCombination: value,
    }));
  }

  function setFilterFieldToken(value: string) {
    setDynamicFilterFieldToken(value);
    setDynamicFilterValue('');
  }

  function addDynamicFilter() {
    const normalizedValue = dynamicFilterValue.trim();
    if (!dynamicFilterField || !normalizedValue) return;

    setViewConfig((current) => {
      const exists = current.dynamicFilters.some(
        (filter) =>
          filter.field.source === dynamicFilterField.source &&
          filter.field.fieldKey === dynamicFilterField.fieldKey &&
          filter.value.trim().toLowerCase() === normalizedValue.toLowerCase(),
      );

      if (exists) {
        return current;
      }

      return {
        ...current,
        dynamicFilters: [
          ...current.dynamicFilters,
          { field: dynamicFilterField, value: normalizedValue },
        ],
      };
    });

    setDynamicFilterValue('');
  }

  function removeDynamicFilter(token: string, value?: string) {
    setViewConfig((current) => ({
      ...current,
      dynamicFilters: current.dynamicFilters.filter((filter) => {
        if (toDynamicFieldToken(filter.field) !== token) {
          return true;
        }

        if (value === undefined) {
          return false;
        }

        return filter.value !== value;
      }),
    }));
  }

  function toggleVisibleField(token: string) {
    const option = fromDynamicFieldToken(token, dynamicFieldOptions);
    if (!option) {
      return;
    }

    const nextField = {
      source: option.source,
      fieldKey: option.fieldKey,
      label: option.label,
      sortOrder: option.sortOrder,
      fieldType: option.fieldType,
    };

    setViewConfig((current) => {
      const isSelected = current.visibleFields.some(
        (field) => toDynamicFieldToken(field) === token,
      );

      if (isSelected) {
        return {
          ...current,
          visibleFields: current.visibleFields.filter(
            (field) => toDynamicFieldToken(field) !== token,
          ),
        };
      }

      return {
        ...current,
        visibleFields: [...current.visibleFields, nextField],
      };
    });
  }

  const clearViewControls = useCallback(() => {
    setViewConfig(DEFAULT_VIEW_CONFIG);
    setDynamicFilterFieldToken('');
    setDynamicFilterValue('');
  }, []);

  const applyViewConfig = useCallback((config: AttendeeViewConfig) => {
    const parsedConfig = attendeeViewConfigSchema.parse(config);
    setViewConfig({
      ...parsedConfig,
      groupBy: normalizeGroupingSortByLevel(parsedConfig.groupBy),
    });
    setDynamicFilterFieldToken('');
    setDynamicFilterValue('');
  }, []);

  function addGroupingLevel() {
    setViewConfig((current) => ({
      ...current,
      groupBy: [
        ...current.groupBy,
        { source: 'registration', fieldKey: '', label: '', groupSort: 'label_asc' },
      ],
    }));
  }

  function changeGroupingField(index: number, token: string) {
    // Try to parse as a dynamic field first
    let nextField = fromDynamicFieldToken(token, dynamicFieldOptions);

    // If not found, try to parse as a static field (role or category)
    if (!nextField && (token === 'role:role' || token === 'category:category')) {
      const source = token.split(':')[0] as 'role' | 'category';
      nextField = {
        source,
        fieldKey: source,
        label: source.charAt(0).toUpperCase() + source.slice(1),
      };
    }

    setViewConfig((current) => {
      const nextGroupBy = [...current.groupBy];
      if (!nextField) {
        nextGroupBy[index] = {
          source: 'registration',
          fieldKey: '',
          label: '',
          groupSort: nextGroupBy[index]?.groupSort ?? 'label_asc',
        };
      } else {
        const isDuplicate = nextGroupBy.some(
          (field, fieldIndex) =>
            fieldIndex !== index && toDynamicFieldToken(field) === toDynamicFieldToken(nextField),
        );
        if (isDuplicate) {
          return current;
        }
        nextGroupBy[index] = {
          ...nextField,
          groupSort: nextGroupBy[index]?.groupSort ?? 'label_asc',
        };
      }

      return {
        ...current,
        groupBy: normalizeGroupingSortByLevel(nextGroupBy),
      };
    });
  }

  function removeGroupingLevel(index: number) {
    setViewConfig((current) => ({
      ...current,
      groupBy: current.groupBy.filter((_, fieldIndex) => fieldIndex !== index),
    }));
  }

  function moveGroupingLevel(index: number, direction: 'up' | 'down') {
    setViewConfig((current) => {
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= current.groupBy.length) return current;

      const nextGroupBy = [...current.groupBy];
      const item = nextGroupBy[index];
      nextGroupBy[index] = nextGroupBy[swapIndex];
      nextGroupBy[swapIndex] = item;

      return {
        ...current,
        groupBy: normalizeGroupingSortByLevel(nextGroupBy),
      };
    });
  }

  function changeGroupingSort(index: number, value: AttendeeViewGroupSort) {
    setViewConfig((current) => {
      if (index < 0 || index >= current.groupBy.length) {
        return current;
      }

      const nextGroupBy = [...current.groupBy];
      nextGroupBy[index] = {
        ...nextGroupBy[index],
        groupSort: value,
      };

      return {
        ...current,
        groupBy: normalizeGroupingSortByLevel(nextGroupBy),
      };
    });
  }

  return {
    viewConfig,
    dynamicFilterField,
    dynamicFilterFieldToken,
    dynamicFilterValue,
    hasActiveFilters,
    setNameOrMemberQuery,
    setRole,
    setCategory,
    setCheckInStatus,
    setDynamicFilterCombination,
    setFilterFieldToken,
    setDynamicFilterValue,
    addDynamicFilter,
    removeDynamicFilter,
    toggleVisibleField,
    clearViewControls,
    applyViewConfig,
    addGroupingLevel,
    changeGroupingField,
    changeGroupingSort,
    removeGroupingLevel,
    moveGroupingLevel,
  };
}
