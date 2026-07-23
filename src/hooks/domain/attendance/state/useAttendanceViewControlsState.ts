import { useCallback, useMemo, useState } from 'react';

import { z } from 'zod';

import {
  type AttendeeViewConfig,
  type AttendeeViewGroupSort,
  type DynamicFieldOption,
  type DynamicFilterCombination,
  attendeeViewConfigSchema,
  fromDynamicFieldToken,
  toDynamicFieldToken,
} from '@/lib/domain/attendance-views';

const DEFAULT_VISIBLE_FIELDS: AttendeeViewConfig['visibleFields'] = [
  { source: 'member', fieldKey: 'avatar', label: 'Avatar', sortOrder: 0 },
  { source: 'member', fieldKey: 'member_id', label: 'RFID', sortOrder: 0 },
  { source: 'role', fieldKey: 'role', label: 'Role', sortOrder: 1 },
  { source: 'category', fieldKey: 'category', label: 'Category', sortOrder: 2 },
];

const DEFAULT_VISIBLE_FIELD_TOKENS = new Set(
  DEFAULT_VISIBLE_FIELDS.map((field) => toDynamicFieldToken(field)),
);

function hasNonDefaultVisibleFields(visibleFields: AttendeeViewConfig['visibleFields']) {
  if (visibleFields.length !== DEFAULT_VISIBLE_FIELDS.length) {
    return true;
  }

  const currentTokens = new Set(visibleFields.map((field) => toDynamicFieldToken(field)));

  if (currentTokens.size !== DEFAULT_VISIBLE_FIELD_TOKENS.size) {
    return true;
  }

  for (const token of DEFAULT_VISIBLE_FIELD_TOKENS) {
    if (!currentTokens.has(token)) {
      return true;
    }
  }

  return false;
}

const DEFAULT_VIEW_CONFIG: AttendeeViewConfig = {
  nameOrMemberQuery: '',
  role: [],
  category: 'all',
  checkInStatus: 'all',
  dynamicFilterCombination: 'and',
  dynamicFilters: [],
  dynamicFilterExpression: undefined,
  groupBy: [],
  visibleFields: DEFAULT_VISIBLE_FIELDS,
};

type RawCustomJsonFilter = {
  token?: string;
  source?: 'registration' | 'attendance';
  fieldKey?: string;
  value: string;
};

type RawCustomJsonExpressionNode =
  | {
      type: 'condition';
      filter: RawCustomJsonFilter;
    }
  | {
      type: 'group';
      op: DynamicFilterCombination;
      children: RawCustomJsonExpressionNode[];
    }
  | {
      type: 'not';
      child: RawCustomJsonExpressionNode;
    };

const customJsonFilterSchema: z.ZodType<RawCustomJsonFilter> = z
  .object({
    token: z.string().trim().min(1).optional(),
    source: z.enum(['registration', 'attendance']).optional(),
    fieldKey: z.string().trim().min(1).optional(),
    value: z.string().trim().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.token) {
      return;
    }

    if (!value.source || !value.fieldKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each filter must provide token or source + fieldKey.',
      });
    }
  });

const customJsonExpressionNodeSchema: z.ZodType<RawCustomJsonExpressionNode> = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal('condition'),
      filter: customJsonFilterSchema,
    }),
    z.object({
      type: z.literal('group'),
      op: z.enum(['and', 'or']),
      children: z.array(customJsonExpressionNodeSchema).min(1),
    }),
    z.object({
      type: z.literal('not'),
      child: customJsonExpressionNodeSchema,
    }),
  ]),
);

const customJsonPayloadSchema = z.union([
  z.array(customJsonFilterSchema),
  z.object({
    dynamicFilterCombination: z.enum(['and', 'or']).optional(),
    combination: z.enum(['and', 'or']).optional(),
    filters: z.array(customJsonFilterSchema).optional(),
    dynamicFilters: z.array(customJsonFilterSchema).optional(),
    expression: customJsonExpressionNodeSchema.optional(),
  }),
]);

type ApplyCustomFilterJsonResult =
  | { ok: true; appliedCount: number }
  | { ok: false; error: string };

type ParsedCustomJsonFilter = z.infer<typeof customJsonFilterSchema>;
type ParsedCustomJsonExpressionNode = z.infer<typeof customJsonExpressionNodeSchema>;

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
    viewConfig.dynamicFilterExpression !== undefined ||
    viewConfig.groupBy.length > 0 ||
    hasNonDefaultVisibleFields(viewConfig.visibleFields);

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
        dynamicFilterExpression: undefined,
      };
    });

    setDynamicFilterValue('');
  }

  function resolveCustomFilterField(filter: ParsedCustomJsonFilter) {
    if (filter.token) {
      return fromDynamicFieldToken(filter.token, dynamicFieldOptions);
    }

    return dynamicFieldOptions.find(
      (field) => field.source === filter.source && field.fieldKey === filter.fieldKey,
    );
  }

  function mapCustomFilter(filter: ParsedCustomJsonFilter) {
    const field = resolveCustomFilterField(filter);
    if (!field) {
      const descriptor = filter.token ?? `${filter.source}:${filter.fieldKey}`;
      return {
        ok: false as const,
        error: `Unknown filter field: ${descriptor}`,
      };
    }

    return {
      ok: true as const,
      filter: {
        field: {
          source: field.source,
          fieldKey: field.fieldKey,
          label: field.label,
          sortOrder: field.sortOrder,
          fieldType: field.fieldType,
        },
        value: filter.value.trim(),
      },
    };
  }

  function mapExpressionNode(
    node: ParsedCustomJsonExpressionNode,
  ):
    | { ok: true; node: NonNullable<AttendeeViewConfig['dynamicFilterExpression']> }
    | { ok: false; error: string } {
    if (node.type === 'condition') {
      const mappedCondition = mapCustomFilter(node.filter);
      if (!mappedCondition.ok) {
        return mappedCondition;
      }

      return {
        ok: true,
        node: {
          type: 'condition',
          filter: mappedCondition.filter,
        },
      };
    }

    if (node.type === 'not') {
      const mappedChild = mapExpressionNode(node.child);
      if (!mappedChild.ok) {
        return mappedChild;
      }

      return {
        ok: true,
        node: {
          type: 'not',
          child: mappedChild.node,
        },
      };
    }

    const mappedChildren: NonNullable<AttendeeViewConfig['dynamicFilterExpression']>[] = [];
    for (const child of node.children) {
      const mappedChild = mapExpressionNode(child);
      if (!mappedChild.ok) {
        return mappedChild;
      }

      mappedChildren.push(mappedChild.node);
    }

    return {
      ok: true,
      node: {
        type: 'group',
        op: node.op,
        children: mappedChildren,
      },
    };
  }

  function applyCustomFilterJson(rawJson: string): ApplyCustomFilterJsonResult {
    const trimmedJson = rawJson.trim();
    if (!trimmedJson) {
      return { ok: false, error: 'JSON input is empty.' };
    }

    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(trimmedJson);
    } catch {
      return { ok: false, error: 'Invalid JSON format.' };
    }

    const parsedPayload = customJsonPayloadSchema.safeParse(rawParsed);
    if (!parsedPayload.success) {
      return {
        ok: false,
        error: parsedPayload.error.issues[0]?.message ?? 'Invalid filter JSON payload.',
      };
    }

    const payload = parsedPayload.data;
    const filters = Array.isArray(payload)
      ? payload
      : (payload.dynamicFilters ?? payload.filters ?? []);
    const nextCombination = Array.isArray(payload)
      ? undefined
      : (payload.dynamicFilterCombination ?? payload.combination);
    const nextExpression = Array.isArray(payload) ? undefined : payload.expression;

    if (!nextExpression && filters.length === 0) {
      return {
        ok: false,
        error: 'No filters found. Provide filters/dynamicFilters or expression.',
      };
    }

    const mappedFilters: AttendeeViewConfig['dynamicFilters'] = [];
    for (const filter of filters) {
      const mappedFilter = mapCustomFilter(filter);
      if (!mappedFilter.ok) {
        return mappedFilter;
      }

      mappedFilters.push(mappedFilter.filter);
    }

    const dedupedFilters = mappedFilters.filter((filter, index, all) => {
      const firstIndex = all.findIndex(
        (candidate) =>
          candidate.field.source === filter.field.source &&
          candidate.field.fieldKey === filter.field.fieldKey &&
          candidate.value.toLowerCase() === filter.value.toLowerCase(),
      );

      return firstIndex === index;
    });

    let mappedExpression: AttendeeViewConfig['dynamicFilterExpression'] = undefined;
    if (nextExpression) {
      const expressionResult = mapExpressionNode(nextExpression);
      if (!expressionResult.ok) {
        return expressionResult;
      }

      mappedExpression = expressionResult.node;
    }

    setViewConfig((current) => ({
      ...current,
      dynamicFilterCombination: nextCombination ?? current.dynamicFilterCombination ?? 'and',
      dynamicFilters: dedupedFilters,
      dynamicFilterExpression: mappedExpression,
    }));

    setDynamicFilterFieldToken('');
    setDynamicFilterValue('');

    return { ok: true, appliedCount: dedupedFilters.length };
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
      dynamicFilterExpression: undefined,
    }));
  }

  function toggleVisibleField(token: string) {
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

      const option = fromDynamicFieldToken(token, dynamicFieldOptions);
      if (!option) {
        return current;
      }

      const nextField = {
        source: option.source,
        fieldKey: option.fieldKey,
        label: option.label,
        sortOrder: option.sortOrder,
        fieldType: option.fieldType,
      };

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
      dynamicFilterExpression: parsedConfig.dynamicFilterExpression,
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
    applyCustomFilterJson,
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
