import { type UseFormReturn } from 'react-hook-form'
import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields'

const baseInputClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary'

type TextFieldRendererProps = {
  field: PublicEventField
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>
}

export function TextFieldRenderer({ field, dynamicForm }: TextFieldRendererProps) {
  return (
    <input
      id={`field-${field.field_key}`}
      type="text"
      placeholder={field.placeholder ?? undefined}
      className={baseInputClassName}
      {...dynamicForm.register(field.field_key)}
    />
  )
}

export function EmailFieldRenderer({ field, dynamicForm }: TextFieldRendererProps) {
  return (
    <input
      id={`field-${field.field_key}`}
      type="email"
      placeholder={field.placeholder ?? undefined}
      className={baseInputClassName}
      {...dynamicForm.register(field.field_key)}
    />
  )
}

export function PhoneFieldRenderer({ field, dynamicForm }: TextFieldRendererProps) {
  return (
    <input
      id={`field-${field.field_key}`}
      type="tel"
      placeholder={field.placeholder ?? undefined}
      className={baseInputClassName}
      {...dynamicForm.register(field.field_key)}
    />
  )
}

export function NumberFieldRenderer({ field, dynamicForm }: TextFieldRendererProps) {
  return (
    <input
      id={`field-${field.field_key}`}
      type="number"
      placeholder={field.placeholder ?? undefined}
      className={baseInputClassName}
      {...dynamicForm.register(field.field_key)}
    />
  )
}

export function TextareaFieldRenderer({ field, dynamicForm }: TextFieldRendererProps) {
  return (
    <textarea
      id={`field-${field.field_key}`}
      placeholder={field.placeholder ?? undefined}
      className={baseInputClassName}
      rows={4}
      {...dynamicForm.register(field.field_key)}
    />
  )
}
