import type { ReactNode } from 'react';

import type { UseFormRegisterReturn } from 'react-hook-form';

type FormTextareaFieldProps = {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: string | null;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  helperText?: string;
  labelAdornment?: ReactNode;
  textareaClassName?: string;
};

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
  } = props;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-text" htmlFor={id}>
        {label}
        {required && <span className="text-red-500"> *</span>}
        {labelAdornment}
      </label>
      <textarea
        {...registration}
        className={`min-h-28 w-full rounded-md border bg-background px-3.5 py-2.5 text-sm leading-6 text-text transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600 ${
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-300/30 focus:shadow-lg focus:shadow-red-500/20'
            : 'border-border focus:border-primary focus:ring-primary/30 focus:shadow-lg focus:shadow-primary/20'
        } ${textareaClassName ?? ''}`}
        disabled={disabled}
        id={id}
        placeholder={placeholder}
        rows={rows}
      />
      {helperText && <p className="text-xs text-muted">{helperText}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
