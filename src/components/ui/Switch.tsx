import type { InputHTMLAttributes } from 'react';

type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type' | 'checked' | 'size'
> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  showStateText?: boolean;
  onText?: string;
  offText?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Accessible switch control for binary on/off actions.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  size = 'md',
  showStateText = false,
  onText = 'YES',
  offText = 'NO',
  className,
  ariaLabel,
  ...inputProps
}: SwitchProps) {
  const isLabeled = showStateText;
  const sizeClasses =
    size === 'sm'
      ? {
          track: isLabeled ? 'h-6 w-[clamp(3.25rem,7vw,4.25rem)]' : 'h-4 w-8',
          thumb: isLabeled ? 'h-3.5 w-3.5' : 'h-3 w-3',
          thumbChecked: isLabeled ? 'right-0.5' : 'translate-x-[1.125rem]',
          thumbUnchecked: isLabeled ? 'left-0.5' : 'translate-x-0.5',
          text: 'text-[9px] leading-none font-semibold',
        }
      : {
          track: isLabeled ? 'h-8 w-[clamp(4.25rem,9vw,5.5rem)]' : 'h-6 w-11',
          thumb: isLabeled ? 'h-6 w-6' : 'h-4 w-4',
          thumbChecked: isLabeled ? 'right-1' : 'translate-x-5',
          thumbUnchecked: isLabeled ? 'left-1' : 'translate-x-1',
          text: 'text-xs tracking-wide font-semibold',
        };

  return (
    <label
      className={cx(
        'inline-flex box-border items-center rounded-full border transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/30',
        isLabeled && 'relative overflow-hidden',
        sizeClasses.track,
        checked
          ? 'border-green-200 bg-green-100 hover:bg-green-200'
          : 'border-slate-300 bg-slate-200 hover:bg-slate-300',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        aria-checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        className="sr-only"
        onChange={(event) => onCheckedChange(event.target.checked)}
        {...inputProps}
      />
      {showStateText && (
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute inset-y-0 flex items-center transition-opacity select-none',
            sizeClasses.text,
            checked ? 'left-1 right-5 justify-start' : 'left-5 right-1 justify-end',
            checked ? 'text-green-800' : 'text-slate-500',
            checked ? 'opacity-100' : 'opacity-90',
          )}
        >
          {checked ? onText : offText}
        </span>
      )}
      <span
        aria-hidden="true"
        className={cx(
          'pointer-events-none rounded-full bg-white shadow-sm transition-all',
          isLabeled ? 'absolute top-1/2 -translate-y-1/2 transform' : 'inline-block transform',
          sizeClasses.thumb,
          checked ? sizeClasses.thumbChecked : sizeClasses.thumbUnchecked,
        )}
      />
    </label>
  );
}
