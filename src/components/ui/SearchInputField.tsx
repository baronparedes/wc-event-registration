import type { ChangeEventHandler, KeyboardEventHandler, ReactNode, Ref } from 'react';

import { Search, X } from 'lucide-react';

import { FormInputField } from './FormInputField';

export interface SearchInputFieldProps {
  id?: string;
  label?: string;
  ariaLabel?: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  inputRef?: Ref<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  className?: string;
  inputClassName?: string;
  error?: string | null;
  helperText?: string;
  labelAdornment?: ReactNode;
}

/** Standardized search input field with leading search icon and consistent design system styling. */
export function SearchInputField({
  id,
  label,
  ariaLabel = 'Search',
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  disabled = false,
  autoComplete = 'off',
  inputRef,
  onKeyDown,
  className,
  inputClassName = '',
  error,
  helperText,
  labelAdornment,
}: SearchInputFieldProps) {
  const showClearButton = Boolean(onClear && value.length > 0 && !disabled);

  return (
    <div className={`relative ${className ?? ''}`}>
      <FormInputField
        id={id}
        label={label}
        ariaLabel={ariaLabel}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        inputRef={inputRef}
        onKeyDown={onKeyDown}
        inputClassName={`pl-10 ${showClearButton ? 'pr-9' : ''} ${inputClassName}`}
        error={error}
        helperText={helperText}
        labelAdornment={labelAdornment}
        backdrop={
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted z-10"
          />
        }
      />
      {showClearButton && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/30 z-10"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
