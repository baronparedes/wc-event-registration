import type {
  ChangeEventHandler,
  KeyboardEventHandler,
  ReactNode,
  Ref,
  UIEventHandler,
} from 'react';

import type { UseFormRegisterReturn } from 'react-hook-form';

type FormTextareaFieldBaseProps = {
  id?: string;
  label?: string;
  ariaLabel?: string;
  error?: string | null;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
  disabled?: boolean;
  maxLength?: number;
  helperText?: string;
  labelAdornment?: ReactNode;
  textareaClassName?: string;
  className?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  onScroll?: UIEventHandler<HTMLTextAreaElement>;
  backdrop?: ReactNode;
};

type RegisteredTextareaProps = {
  registration: UseFormRegisterReturn;
  value?: never;
  onChange?: never;
};

type ControlledTextareaProps = {
  registration?: never;
  value: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
};

export type FormTextareaFieldProps = FormTextareaFieldBaseProps &
  (RegisteredTextareaProps | ControlledTextareaProps);

/** Shared labeled textarea field with consistent styling and error rendering. */
export function FormTextareaField(props: FormTextareaFieldProps) {
  const {
    id,
    label,
    ariaLabel,
    registration,
    value,
    onChange,
    error,
    required,
    placeholder,
    rows = 4,
    readOnly,
    disabled,
    maxLength,
    helperText,
    labelAdornment,
    textareaClassName,
    className,
    textareaRef,
    onKeyDown,
    onScroll,
    backdrop,
  } = props;

  const controlledProps = registration
    ? registration
    : {
        value,
        onChange,
      };

  const hasCustomMinHeight = textareaClassName?.includes('min-h-');

  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      {label && (
        <label className="block text-sm font-semibold text-text" htmlFor={id}>
          {label}
          {required && <span className="text-red-500"> *</span>}
          {labelAdornment}
        </label>
      )}
      <div className="relative w-full">
        {backdrop}
        <textarea
          {...controlledProps}
          ref={textareaRef ?? (registration ? registration.ref : undefined)}
          aria-label={ariaLabel}
          className={`${
            hasCustomMinHeight ? '' : 'min-h-28 '
          }w-full rounded-md border bg-background px-3.5 py-2.5 text-sm leading-6 text-text transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600 ${
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-300/30 focus:shadow-lg focus:shadow-red-500/20'
              : 'border-border focus:border-primary focus:ring-primary/30 focus:shadow-lg focus:shadow-primary/20'
          } ${textareaClassName ?? ''}`}
          disabled={disabled}
          id={id}
          maxLength={maxLength}
          placeholder={placeholder}
          readOnly={readOnly}
          rows={rows}
          onKeyDown={onKeyDown}
          onScroll={onScroll}
        />
      </div>
      {(error || helperText) && (
        <div className="flex items-center justify-between gap-2 text-xs">
          {error ? <p className="text-red-600 min-w-0 flex-1">{error}</p> : <span />}
          {helperText && <p className="text-muted text-right shrink-0 ml-auto">{helperText}</p>}
        </div>
      )}
    </div>
  );
}
