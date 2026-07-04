import type { UseFormRegisterReturn } from 'react-hook-form';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600';

type RuleInputProps = {
  id: string;
  label: string;
  type: 'number' | 'date' | 'text';
  registration: UseFormRegisterReturn;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
};

/** Input for validation rule fields. */
export function RuleInput({
  id,
  label,
  type,
  registration,
  disabled = false,
  placeholder,
  helperText,
}: RuleInputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-text" htmlFor={id}>
        {label}
      </label>
      <input
        {...registration}
        id={id}
        type={type}
        disabled={disabled}
        placeholder={placeholder}
        className={inputClass}
      />
      {helperText && <p className="text-xs text-muted">{helperText}</p>}
    </div>
  );
}
