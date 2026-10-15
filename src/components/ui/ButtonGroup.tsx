import React, { createContext, useContext, useMemo } from 'react';

import { twMerge } from 'tailwind-merge';

export type ButtonGroupSize = 'xs' | 'sm' | 'md';

export interface ButtonGroupOption<T extends string | number = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

interface ButtonGroupContextValue {
  value?: string | number;
  onChange?: (val: string | number) => void;
  size: ButtonGroupSize;
  disabled?: boolean;
  fullWidth?: boolean;
}

const ButtonGroupContext = createContext<ButtonGroupContextValue | null>(null);

function useButtonGroupContext(componentName: string): ButtonGroupContextValue {
  const context = useContext(ButtonGroupContext);
  if (!context) {
    throw new Error(`<${componentName} /> must be used within a <ButtonGroup />.`);
  }
  return context;
}

const SIZE_STYLES: Record<ButtonGroupSize, { container: string; item: string }> = {
  xs: {
    container: 'p-0.5 rounded-lg',
    item: 'px-2 py-0.5 text-xs',
  },
  sm: {
    container: 'p-0.5 rounded-lg',
    item: 'px-2.5 py-1 text-xs',
  },
  md: {
    container: 'p-1 rounded-xl',
    item: 'px-3.5 py-1.5 text-sm',
  },
};

export interface ButtonGroupProps<T extends string | number = string> {
  value?: T;
  onChange?: (value: T) => void;
  options?: ButtonGroupOption<T>[];
  children?: React.ReactNode;
  size?: ButtonGroupSize;
  fullWidth?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export interface ButtonGroupItemProps<T extends string | number = string> {
  value: T;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function ButtonGroupItem<T extends string | number = string>({
  value,
  children,
  icon,
  disabled = false,
  ariaLabel,
  className = '',
}: ButtonGroupItemProps<T>) {
  const context = useButtonGroupContext('ButtonGroup.Item');
  const isSelected = context.value === value;
  const isDisabled = disabled || context.disabled;
  const sizeStyles = SIZE_STYLES[context.size];

  return (
    <button
      type="button"
      role="button"
      aria-pressed={isSelected}
      aria-label={ariaLabel}
      disabled={isDisabled}
      onClick={() => {
        if (!isDisabled && context.onChange) {
          context.onChange(value);
        }
      }}
      className={twMerge(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        sizeStyles.item,
        isSelected
          ? 'bg-primary text-white shadow-xs font-bold'
          : 'text-muted hover:text-text hover:bg-surface-hover/80',
        isDisabled && 'pointer-events-none opacity-40 cursor-not-allowed',
        context.fullWidth && 'flex-1',
        className,
      )}
    >
      {icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
}

export function ButtonGroup<T extends string | number = string>({
  value,
  onChange,
  options,
  children,
  size = 'sm',
  fullWidth = false,
  disabled = false,
  ariaLabel,
  className = '',
}: ButtonGroupProps<T>) {
  const contextValue = useMemo<ButtonGroupContextValue>(
    () => ({
      value,
      onChange: onChange ? (val) => onChange(val as T) : undefined,
      size,
      disabled,
      fullWidth,
    }),
    [value, onChange, size, disabled, fullWidth],
  );

  const sizeStyles = SIZE_STYLES[size];

  return (
    <ButtonGroupContext.Provider value={contextValue}>
      <div
        role="group"
        aria-label={ariaLabel}
        className={twMerge(
          'inline-flex items-center border border-border bg-surface-hover/50',
          sizeStyles.container,
          fullWidth && 'flex w-full',
          className,
        )}
      >
        {options
          ? options.map((opt) => (
              <ButtonGroupItem
                key={String(opt.value)}
                value={opt.value}
                icon={opt.icon}
                disabled={opt.disabled}
                ariaLabel={opt.ariaLabel}
                className={opt.className}
              >
                {opt.label}
              </ButtonGroupItem>
            ))
          : children}
      </div>
    </ButtonGroupContext.Provider>
  );
}

ButtonGroup.Item = ButtonGroupItem;
