import type { UseFormRegisterReturn } from 'react-hook-form'
import { LockedFieldIndicator } from './LockedFieldIndicator'

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted'

type RuleInputProps = {
  id: string
  label: string
  type: 'number' | 'date' | 'text'
  registration: UseFormRegisterReturn
  disabled: boolean
  placeholder?: string
  helperText?: string
}

/** Input for validation rule fields. */
export function RuleInput({
  id,
  label,
  type,
  registration,
  disabled,
  placeholder,
  helperText,
}: RuleInputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-text" htmlFor={id}>
        {label}
        {disabled && <LockedFieldIndicator />}
      </label>
      <input
        {...registration}
        id={id}
        type={type}
        disabled={disabled}
        placeholder={placeholder}
        className={inputClass}
      />
      {helperText ? <p className="text-xs text-muted">{helperText}</p> : null}
    </div>
  )
}
