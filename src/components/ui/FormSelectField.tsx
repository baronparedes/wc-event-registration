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
  disabled?: boolean
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
    disabled,
    helperText,
    labelAdornment,
    selectClassName,
  } = props

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-text" htmlFor={id}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
        {labelAdornment}
      </label>
      <select
        {...registration}
        className={`w-full rounded-md border bg-background px-3.5 py-2.5 text-sm leading-6 text-text focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600 ${
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-300/30'
            : 'border-border focus:border-primary focus:ring-primary/30'
        } ${selectClassName ?? ''}`}
        disabled={disabled}
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
