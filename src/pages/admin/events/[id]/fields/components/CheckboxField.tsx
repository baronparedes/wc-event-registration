import type { UseFormRegisterReturn } from 'react-hook-form';

import { LockedFieldIndicator } from './LockedFieldIndicator';

type CheckboxFieldProps = {
  id: string;
  label: string;
  description: string;
  registration: UseFormRegisterReturn;
  disabled: boolean;
  showLock: boolean;
};

/** Checkbox toggle for boolean field properties. */
export function CheckboxField({
  id,
  label,
  description,
  registration,
  disabled,
  showLock,
}: CheckboxFieldProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      <input
        {...registration}
        id={id}
        type="checkbox"
        disabled={disabled}
        className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-primary/30 disabled:cursor-not-allowed"
      />
      <div>
        <label
          htmlFor={id}
          className="flex cursor-pointer items-center gap-1 text-sm font-medium text-text"
        >
          {label}
          {showLock && <LockedFieldIndicator />}
        </label>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </div>
  );
}
