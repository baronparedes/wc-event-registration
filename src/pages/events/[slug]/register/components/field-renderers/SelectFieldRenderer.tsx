import { type UseFormReturn } from 'react-hook-form'
import type {
  DynamicFieldResponseValues,
  PublicEventField,
} from '../../../../../../lib/event-registration'

const baseInputClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary'

type SelectFieldRendererProps = {
  field: PublicEventField
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>
}

export function SelectFieldRenderer({ field, dynamicForm }: SelectFieldRendererProps) {
  return (
    <select
      id={`field-${field.field_key}`}
      className={baseInputClassName}
      {...dynamicForm.register(field.field_key)}
    >
      <option value="">Select an option</option>
      {field.options.map((option: { value: string; label: string }) => (
        <option key={`${field.id}-${option.value}`} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function RadioFieldRenderer({ field, dynamicForm }: SelectFieldRendererProps) {
  return (
    <div className="space-y-2">
      {field.options.map((option: { value: string; label: string }) => (
        <label
          key={`${field.id}-${option.value}`}
          className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm text-text"
        >
          <input type="radio" value={option.value} {...dynamicForm.register(field.field_key)} />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}

export function MultiSelectFieldRenderer({ field, dynamicForm }: SelectFieldRendererProps) {
  return (
    <div className="space-y-2">
      {field.options.map((option: { value: string; label: string }) => (
        <label
          key={`${field.id}-${option.value}`}
          className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm text-text"
        >
          <input type="checkbox" value={option.value} {...dynamicForm.register(field.field_key)} />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
