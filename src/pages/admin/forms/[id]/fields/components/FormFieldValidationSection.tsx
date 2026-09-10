import { SectionCard } from '@/components/ui/SectionCard';

type RuleInputProps = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date';
  placeholder?: string;
  helperText?: string;
};

function RuleInput({ id, label, type, placeholder, helperText }: RuleInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-text">
        {label}
      </label>
      {/* Validation rules are stored as free-form JSON; plain uncontrolled inputs for display */}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        name={id}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {helperText && <p className="mt-1 text-xs text-muted">{helperText}</p>}
    </div>
  );
}

type FormFieldValidationSectionProps = {
  showTextValidation: boolean;
  showNumberValidation: boolean;
  showMultiSelectValidation: boolean;
  showDateValidation: boolean;
};

/** Section for validation rule inputs (text, number, date, multi-select). */
export function FormFieldValidationSection({
  showTextValidation,
  showNumberValidation,
  showMultiSelectValidation,
  showDateValidation,
}: FormFieldValidationSectionProps) {
  return (
    <SectionCard
      title="Validation Rules"
      subtitle="Optional constraints applied when the form is submitted."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {showTextValidation && (
          <>
            <RuleInput
              id="val_min_length"
              label="Minimum Length"
              type="number"
              placeholder="e.g., 3"
              helperText="Minimum number of characters required."
            />
            <RuleInput
              id="val_max_length"
              label="Maximum Length"
              type="number"
              placeholder="e.g., 100"
              helperText="Maximum number of characters allowed."
            />
            <div className="sm:col-span-2">
              <RuleInput
                id="val_pattern"
                label="Pattern (Regex)"
                type="text"
                placeholder="e.g., ^[A-Za-z\s]+$"
                helperText="Optional regular expression the value must match."
              />
            </div>
          </>
        )}
        {showNumberValidation && (
          <>
            <RuleInput id="val_min" label="Minimum Value" type="number" placeholder="e.g., 0" />
            <RuleInput id="val_max" label="Maximum Value" type="number" placeholder="e.g., 10" />
          </>
        )}
        {showMultiSelectValidation && (
          <>
            <RuleInput
              id="val_min_selections"
              label="Minimum Selections"
              type="number"
              placeholder="e.g., 1"
            />
            <RuleInput
              id="val_max_selections"
              label="Maximum Selections"
              type="number"
              placeholder="e.g., 3"
            />
          </>
        )}
        {showDateValidation && (
          <>
            <RuleInput id="val_min_date" label="Earliest Allowed Date" type="date" />
            <RuleInput id="val_max_date" label="Latest Allowed Date" type="date" />
          </>
        )}
      </div>
    </SectionCard>
  );
}
