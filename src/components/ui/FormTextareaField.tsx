import type { ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

type FormTextareaFieldProps = {
  id: string
  label: string
  registration: UseFormRegisterReturn
  error?: string | null
  required?: boolean
  placeholder?: string
  rows?: number
  disabled?: boolean
  helperText?: string
  labelAdornment?: ReactNode
  textareaClassName?: string
}

/** Shared labeled textarea field with consistent styling and error rendering. */
export function FormTextareaField(props: FormTextareaFieldProps) {
  const {
    id,
    label,
    registration,
    error,
    required,
    placeholder,
    rows = 4,
    disabled,
    helperText,
    labelAdornment,
    textareaClassName,
  } = props

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-text" htmlFor={id}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
        {labelAdornment}
      </label>
      <textarea
        {...registration}
        className={`w-full rounded-md border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 disabled:bg-muted disabled:cursor-not-allowed disabled:text-muted ${
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-300/30'
            : 'border-border focus:border-primary focus:ring-primary/30'
        } ${textareaClassName ?? ''}`}
        disabled={disabled}
        id={id}
        placeholder={placeholder}
        rows={rows}
      />
      {helperText ? <p className="text-xs text-muted">{helperText}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
