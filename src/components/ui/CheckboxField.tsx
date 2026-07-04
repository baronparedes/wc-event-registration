import type { UseFormRegisterReturn } from 'react-hook-form';

type CheckboxFieldProps = {
  id: string;
  label: string;
  description: string;
  registration: UseFormRegisterReturn;
  disabled?: boolean;
  showLock?: boolean;
};

/** Reusable checkbox field component for boolean form properties. */
export function CheckboxField({
  id,
  label,
  description,
  registration,
  disabled = false,
  showLock = false,
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
          {showLock && (
            <span
              className="ml-1.5 inline-flex cursor-help items-center text-amber-500"
              title="This field cannot be changed on published events. Archive and create a new event to change the registration form structure."
              aria-label="This field cannot be changed on published events. Archive and create a new event to change the registration form structure."
              role="img"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path d="M4.5 4a2.5 2.5 0 0 1 5 0v1h1.006a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-.75.75h-8.5a.75.75 0 0 1-.75-.75v-6.5a.75.75 0 0 1 .75-.75H4.5V4zm3 1v-.5a1.5 1.5 0 0 0-3 0v.5h3zM2 9.5v1h12v-1H2z" />
              </svg>
            </span>
          )}
        </label>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </div>
  );
}
