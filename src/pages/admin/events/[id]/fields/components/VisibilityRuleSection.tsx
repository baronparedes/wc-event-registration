import type { UseFormRegister } from 'react-hook-form';

import { SectionCard } from '@/components/ui/SectionCard';

type VisibilityRuleSectionProps = {
  isLocked?: boolean;
  availableParentFields: Array<{ field_key: string; label: string }>;
  dependsOnFieldKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
};

/** Section for setting conditional field visibility rules. */
export function VisibilityRuleSection({
  isLocked = false,
  availableParentFields,
  dependsOnFieldKey,
  register,
}: VisibilityRuleSectionProps) {
  const hasParentSelected = Boolean(dependsOnFieldKey && dependsOnFieldKey.trim().length > 0);

  return (
    <SectionCard
      title="Conditional Visibility"
      subtitle="Only show this field when a specific option or answer is selected in another field."
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="val_visibility_depends_on_field_key"
            className="block text-xs font-medium text-text"
          >
            Depends On Field
          </label>
          <select
            id="val_visibility_depends_on_field_key"
            disabled={isLocked || availableParentFields.length === 0}
            {...register('val_visibility_depends_on_field_key')}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">-- Always Visible (No Dependency) --</option>
            {availableParentFields.map((f) => (
              <option key={f.field_key} value={f.field_key}>
                {f.label} ({f.field_key})
              </option>
            ))}
          </select>
          {availableParentFields.length === 0 && (
            <p className="mt-1 text-xs text-muted">
              No other fields are available in this event yet to depend on.
            </p>
          )}
        </div>

        {hasParentSelected && (
          <div>
            <label
              htmlFor="val_visibility_equals_value"
              className="block text-xs font-medium text-text"
            >
              When Value Equals
            </label>
            <input
              id="val_visibility_equals_value"
              type="text"
              disabled={isLocked}
              placeholder="e.g., Others"
              {...register('val_visibility_equals_value')}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-100 disabled:text-gray-500"
            />
            <p className="mt-1 text-xs text-muted">
              This field will only be shown when the parent field equals this value
              (case-insensitive & trimmed).
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
