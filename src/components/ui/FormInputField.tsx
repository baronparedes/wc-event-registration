import type { ChangeEventHandler, ReactNode } from 'react';

import type { UseFormRegisterReturn } from 'react-hook-form';

type FormInputFieldBaseProps = {
  id: string;
  label: string;
  error?: string | null;
  required?: boolean;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'date' | 'datetime-local';
  autoComplete?: string;
  readOnly?: boolean;
  disabled?: boolean;
  helperText?: string;
  labelAdornment?: ReactNode;
  inputClassName?: string;
};

type RegisteredInputProps = {
  registration: UseFormRegisterReturn;
  value?: never;
  onChange?: never;
};

type ControlledInputProps = {
  registration?: never;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

type FormInputFieldProps = FormInputFieldBaseProps & (RegisteredInputProps | ControlledInputProps);

/** Shared labeled input field with consistent styling and error rendering. */
export function FormInputField(props: FormInputFieldProps) {
  const {
    id,
    label,
    registration,
    value,
    onChange,
    error,
    required,
    placeholder,
    type = 'text',
    autoComplete,
    readOnly,
    disabled,
    helperText,
    labelAdornment,
    inputClassName,
  } = props;

  const controlledProps = registration
    ? registration
    : {
        value,
        onChange,
      };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-text" htmlFor={id}>
        {label}
        {required && <span className="text-red-500"> *</span>}
        {labelAdornment}
      </label>
      <input
        {...controlledProps}
        className={`w-full rounded-md border bg-background px-3.5 py-2.5 text-sm leading-6 text-text transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600 ${
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-300/30 focus:shadow-lg focus:shadow-red-500/20'
            : 'border-border focus:border-primary focus:ring-primary/30 focus:shadow-lg focus:shadow-primary/20'
        } ${inputClassName ?? ''}`}
        autoComplete={autoComplete}
        disabled={disabled}
        id={id}
        placeholder={placeholder}
        readOnly={readOnly}
        type={type}
      />
      {helperText && <p className="text-xs text-muted">{helperText}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
