import { type UseFormReturn } from 'react-hook-form';

import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields';

type CheckboxFieldRendererProps = {
  field: PublicEventField;
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>;
};

export function CheckboxFieldRenderer({ field, dynamicForm }: CheckboxFieldRendererProps) {
  return (
    <label
      htmlFor={`field-${field.field_key}`}
      className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm text-text"
    >
      <input
        id={`field-${field.field_key}`}
        type="checkbox"
        {...dynamicForm.register(field.field_key)}
      />
      <span>{field.placeholder ?? 'I confirm this statement.'}</span>
    </label>
  );
}
