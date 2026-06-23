import type {
  UseFormRegister,
  FieldErrors,
  UseFieldArrayRemove,
  UseFieldArrayAppend,
  FieldArrayWithId,
} from 'react-hook-form'
import type { EventFieldFormValues } from '../../../../../../lib/admin/eventFieldSchema'
import { Button } from '../../../../../../components/ui/Button'

type FieldOptionsEditorProps = {
  fields: FieldArrayWithId<EventFieldFormValues, 'options', 'id'>[]
  register: UseFormRegister<EventFieldFormValues>
  errors: FieldErrors<EventFieldFormValues>
  remove: UseFieldArrayRemove
  append: UseFieldArrayAppend<EventFieldFormValues, 'options'>
  isLocked: boolean
}

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600'

/** Manages the options list for select, radio, and multi_select field types. */
export function FieldOptionsEditor({
  fields,
  register,
  errors,
  remove,
  append,
  isLocked,
}: FieldOptionsEditorProps) {
  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-sm text-muted">No options added yet. Add at least one option.</p>
      )}
      {fields.map((field, index) => {
        const labelError = errors.options?.[index]?.label?.message
        const valueError = errors.options?.[index]?.value?.message
        return (
          <div key={field.id} className="flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <input
                {...register(`options.${index}.label`)}
                disabled={isLocked}
                placeholder="Display label (e.g., Small)"
                aria-label={`Option ${index + 1} label`}
                className={`${inputClass} ${labelError ? 'border-red-400' : ''}`}
              />
              {labelError ? <p className="text-xs text-red-600">{labelError}</p> : null}
            </div>
            <div className="flex-1 space-y-1">
              <input
                {...register(`options.${index}.value`)}
                disabled={isLocked}
                placeholder="Stored value (e.g., small)"
                aria-label={`Option ${index + 1} value`}
                className={`${inputClass} ${valueError ? 'border-red-400' : ''}`}
              />
              {valueError ? <p className="text-xs text-red-600">{valueError}</p> : null}
            </div>
            {!isLocked && (
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove option ${index + 1}`}
                className="mt-2 text-sm text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            )}
          </div>
        )
      })}
      {!isLocked && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ label: '', value: '' })}
        >
          + Add Option
        </Button>
      )}
    </div>
  )
}
