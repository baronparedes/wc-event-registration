import { type ReactNode } from 'react';

import { type UseFormReturn } from 'react-hook-form';

import type {
  DynamicFieldResponseValues,
  EventFieldType,
  PublicEventField,
} from '@/lib/domain/event-fields';

import { DynamicFieldRenderer } from './DynamicFieldRenderer';

export interface RenderFieldByTypeOptions {
  memberRole?: string;
  remainingSlotsByOption?: Record<string, number>;
  remainingSlotsByRoleByOption?: Record<string, Record<string, number>>;
}

/**
 * @deprecated Use <DynamicFieldRenderer field={field} dynamicForm={dynamicForm} {...options} /> instead.
 */
export function renderFieldByType(
  _fieldType: EventFieldType,
  field: PublicEventField,
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>,
  options: RenderFieldByTypeOptions = {},
): ReactNode {
  return (
    <DynamicFieldRenderer
      field={field}
      dynamicForm={dynamicForm}
      memberRole={options.memberRole}
      remainingSlotsByOption={options.remainingSlotsByOption}
      remainingSlotsByRoleByOption={options.remainingSlotsByRoleByOption}
    />
  );
}
