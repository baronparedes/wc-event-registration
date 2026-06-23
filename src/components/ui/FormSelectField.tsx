import type { ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

type SelectOption = {
  value: string
  label: string
}

type FormSelectFieldProps = {
  id: string
  label: string
  registration: UseFormRegisterReturn
  options: SelectOption[]
  error?: string | null
  required?: boolean
  helperText?: string
  labelAdornment?: ReactNode
  selectClassName?: string
}

/** Shared labeled select field with consistent styling and error rendering. */
export function FormSelectField(props: FormSelectFieldProps) {
  const {
    id,
    label,
    registration,
    options,
    error,
    required,
    helperText,
    labelAdornment,
    selectClassName,
  } = props

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-text" htmlFor={id}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
        {labelAdornment}
      </label>
      <select
        {...registration}
        className={`w-full rounded-md border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-300/30'
            : 'border-border focus:border-primary focus:ring-primary/30'
        } ${selectClassName ?? ''}`}
        id={id}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <p className="text-xs text-muted">{helperText}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
