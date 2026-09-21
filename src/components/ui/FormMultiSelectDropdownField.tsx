import { ChevronDown } from 'lucide-react';

type MultiSelectOption = {
  value: string;
  label: string;
};

type FormMultiSelectDropdownFieldProps = {
  label?: string;
  className?: string;
  buttonClassName?: string;
  triggerAriaLabel: string;
  optionsAriaLabel: string;
  selectedLabel: string;
  options: Array<string | MultiSelectOption>;
  selectedValues: string[];
  isOpen: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  clearButtonLabel: string;
  emptyStateLabel?: string;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
  onClearSelection: () => void;
  onToggleSelection: (value: string) => void;
};

export function FormMultiSelectDropdownField({
  label,
  className,
  buttonClassName,
  triggerAriaLabel,
  optionsAriaLabel,
  selectedLabel,
  options,
  selectedValues,
  isOpen,
  containerRef,
  clearButtonLabel,
  emptyStateLabel = 'No options available.',
  onToggleDropdown,
  onCloseDropdown,
  onClearSelection,
  onToggleSelection,
}: FormMultiSelectDropdownFieldProps) {
  const normalizedOptions = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );

  return (
    <div className={`${label ? 'space-y-1.5' : ''} ${className ?? ''}`} ref={containerRef}>
      {label && <label className="block text-sm font-semibold text-text">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={onToggleDropdown}
          className={`flex w-full items-center justify-between border border-border bg-background text-left text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
            buttonClassName ?? 'h-10 rounded-xl px-3 py-2'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={triggerAriaLabel}
        >
          <span className="truncate mr-1">{selectedLabel}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div
            className="absolute z-40 mt-1 w-full rounded-xl border border-border bg-surface p-2 shadow-md"
            role="listbox"
            aria-label={optionsAriaLabel}
          >
            <button
              type="button"
              onClick={() => {
                onClearSelection();
                onCloseDropdown();
              }}
              className="mb-1 w-full rounded-lg px-2 py-1 text-left text-sm text-text transition hover:bg-slate-50"
            >
              {clearButtonLabel}
            </button>
            <div className="max-h-44 overflow-y-auto">
              {normalizedOptions.length === 0 ? (
                <p className="rounded-lg px-2 py-1 text-sm text-muted">{emptyStateLabel}</p>
              ) : (
                normalizedOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm text-text transition hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(option.value)}
                      onChange={() => onToggleSelection(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
