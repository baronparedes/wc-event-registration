import { useEffect, useState } from 'react';
import type { ChangeEvent, FocusEvent, ReactNode } from 'react';

import { ChevronDown } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { useDropdownPlacement } from '@/hooks/utils';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  isGroupHeader?: boolean;
};

type FormSelectFieldProps = {
  id?: string;
  label?: string;
  ariaLabel?: string;
  registration?: UseFormRegisterReturn;
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  labelAdornment?: ReactNode;
  selectClassName?: string;
};

/** Shared labeled custom dropdown field with consistent styling and error rendering. */
export function FormSelectField(props: FormSelectFieldProps) {
  const {
    id,
    label,
    ariaLabel,
    registration,
    value,
    onChange,
    options,
    placeholder = 'Select...',
    error,
    required,
    disabled,
    helperText,
    labelAdornment,
    selectClassName,
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const { containerRef, opensUpward, prepareOpenDirection } = useDropdownPlacement({
    isOpen,
    optionCount: options.length,
    includesPlaceholder: Boolean(placeholder),
  });

  const selectedOption = options.find((o) => !o.isGroupHeader && o.value === value);
  const displayLabel = selectedOption?.label ?? placeholder;
  const isPlaceholderShown = !selectedOption;

  useEffect(() => {
    if (!isOpen) return;

    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, isOpen]);

  function handleSelect(optionValue: string) {
    setIsOpen(false);
    onChange?.(optionValue);
    if (registration) {
      registration.onChange({
        target: { value: optionValue, name: registration.name },
      } as ChangeEvent<HTMLSelectElement>);
      registration.onBlur({
        target: { name: registration.name },
      } as FocusEvent<HTMLSelectElement>);
    }
  }

  const { ref: registrationRef } = registration ?? {};

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-text" htmlFor={id}>
          {label}
          {required && <span className="text-red-500"> *</span>}
          {labelAdornment}
        </label>
      )}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          id={id}
          ref={registrationRef}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={ariaLabel}
          onClick={() => {
            if (!isOpen) {
              prepareOpenDirection();
            }
            setIsOpen((prev) => !prev);
          }}
          className={`flex w-full items-center justify-between rounded-md border bg-background px-3.5 py-2.5 text-sm leading-6 transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600 ${
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-300/30 focus:shadow-lg focus:shadow-red-500/20'
              : 'border-border focus:border-primary focus:ring-primary/30 focus:shadow-lg focus:shadow-primary/20'
          } ${isPlaceholderShown ? 'text-muted' : 'text-text'} ${selectClassName ?? ''}`}
        >
          <span className="truncate text-left">{displayLabel}</span>
          <ChevronDown
            aria-hidden="true"
            className={`ml-2 h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isOpen && !disabled && (
          <ul
            role="listbox"
            aria-label={ariaLabel ?? label}
            className={`absolute z-50 max-h-60 w-full overflow-auto rounded-md border border-border bg-background py-1 shadow-lg ${
              opensUpward ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
            {placeholder && (
              <li
                role="option"
                aria-selected={isPlaceholderShown}
                onClick={() => handleSelect('')}
                className={`cursor-pointer px-3.5 py-2.5 text-sm text-muted hover:bg-primary/5 ${isPlaceholderShown ? 'bg-primary/5' : ''}`}
              >
                {placeholder}
              </li>
            )}
            {options.map((option, idx) =>
              option.isGroupHeader ? (
                <li
                  key={`header-${idx}`}
                  className="select-none px-3.5 pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  {option.label}
                </li>
              ) : (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled}
                  onClick={() => {
                    if (!option.disabled) handleSelect(option.value);
                  }}
                  className={`px-3.5 py-2.5 text-sm ${
                    option.disabled
                      ? 'cursor-not-allowed opacity-50 text-muted'
                      : option.value === value
                        ? 'cursor-pointer bg-primary/10 text-primary'
                        : 'cursor-pointer text-text hover:bg-primary/5'
                  }`}
                >
                  {option.label}
                </li>
              ),
            )}
          </ul>
        )}
      </div>
      {helperText && <p className="text-xs text-muted">{helperText}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
