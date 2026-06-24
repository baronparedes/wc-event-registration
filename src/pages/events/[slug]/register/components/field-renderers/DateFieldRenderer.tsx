import { type UseFormReturn } from 'react-hook-form'
import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields'

const baseInputClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary'

type DateFieldRendererProps = {
  field: PublicEventField
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>
}

export function DateFieldRenderer({ field, dynamicForm }: DateFieldRendererProps) {
  return (
    <input
      id={`field-${field.field_key}`}
      type="date"
      className={baseInputClassName}
      {...dynamicForm.register(field.field_key)}
    />
  )
}

export function DatetimeFieldRenderer({ field, dynamicForm }: DateFieldRendererProps) {
  return (
    <input
      id={`field-${field.field_key}`}
      type="datetime-local"
      className={baseInputClassName}
      {...dynamicForm.register(field.field_key)}
    />
  )
}
