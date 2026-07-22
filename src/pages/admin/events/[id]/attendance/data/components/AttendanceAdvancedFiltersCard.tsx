import { useState } from 'react';

import { Filter } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import type {
  AttendeeViewConfig,
  DynamicFieldOption,
  DynamicFilterCombination,
} from '@/lib/domain/attendance-views';
import { toDynamicFieldToken } from '@/lib/domain/attendance-views';

type AttendanceAdvancedFiltersCardProps = {
  dynamicFilterCombination: DynamicFilterCombination;
  dynamicFilterFieldToken: string;
  dynamicFilterValue: string;
  dynamicFilterFieldLabel: string | null;
  dynamicFilterFieldType?: DynamicFieldOption['fieldType'] | null;
  registrationDynamicFieldOptions: DynamicFieldOption[];
  attendanceDynamicFieldOptions: DynamicFieldOption[];
  customFilterJson: string;
  customFilterJsonError: string | null;
  dynamicFilters: AttendeeViewConfig['dynamicFilters'];
  onDynamicFilterCombinationChange: (value: DynamicFilterCombination) => void;
  onDynamicFilterFieldTokenChange: (value: string) => void;
  onDynamicFilterValueChange: (value: string) => void;
  onApplyDynamicFilter: () => void;
  onCustomFilterJsonChange: (value: string) => void;
  onApplyCustomJson: () => void;
  onRemoveDynamicFilter: (token: string, value: string) => void;
};

export function AttendanceAdvancedFiltersCard({
  dynamicFilterCombination,
  dynamicFilterFieldToken,
  dynamicFilterValue,
  dynamicFilterFieldLabel,
  dynamicFilterFieldType = null,
  registrationDynamicFieldOptions,
  attendanceDynamicFieldOptions,
  customFilterJson,
  customFilterJsonError,
  dynamicFilters,
  onDynamicFilterCombinationChange,
  onDynamicFilterFieldTokenChange,
  onDynamicFilterValueChange,
  onApplyDynamicFilter,
  onCustomFilterJsonChange,
  onApplyCustomJson,
  onRemoveDynamicFilter,
}: AttendanceAdvancedFiltersCardProps) {
  const [isCustomJsonMode, setIsCustomJsonMode] = useState(false);

  return (
    <>
      <div className="grid gap-2 md:col-span-3 lg:grid-cols-4 lg:items-end">
        <div className="flex justify-end lg:col-span-4">
          <button
            type="button"
            className="p-0 text-xs font-medium leading-none text-primary underline-offset-2 transition hover:underline"
            onClick={() => setIsCustomJsonMode((current) => !current)}
          >
            {isCustomJsonMode ? 'Switch to Field Filter' : 'Switch to Custom JSON Filter'}
          </button>
        </div>

        {!isCustomJsonMode && (
          <>
            <select
              aria-label="Field-Based Conditions"
              value={dynamicFilterCombination}
              onChange={(event) =>
                onDynamicFilterCombinationChange(event.target.value as DynamicFilterCombination)
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="and">All filters must match (AND)</option>
              <option value="or">Any filter can match (OR)</option>
            </select>

            <select
              aria-label="Filter field"
              value={dynamicFilterFieldToken}
              onChange={(event) => onDynamicFilterFieldTokenChange(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a field</option>
              {registrationDynamicFieldOptions.length > 0 && (
                <optgroup label="Registration Fields">
                  {registrationDynamicFieldOptions.map((field) => (
                    <option key={field.token} value={field.token}>
                      {field.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {attendanceDynamicFieldOptions.length > 0 && (
                <optgroup label="Attendance Fields">
                  {attendanceDynamicFieldOptions.map((field) => (
                    <option key={field.token} value={field.token}>
                      {field.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <div className="flex items-end gap-2 lg:col-span-2">
              <input
                aria-label="Field value"
                type="text"
                value={dynamicFilterValue}
                onChange={(event) => onDynamicFilterValueChange(event.target.value)}
                disabled={!dynamicFilterFieldLabel}
                placeholder={
                  dynamicFilterFieldLabel
                    ? `Enter value for ${dynamicFilterFieldLabel}`
                    : 'Select a field first'
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onApplyDynamicFilter}
                disabled={!dynamicFilterFieldLabel || dynamicFilterValue.trim().length === 0}
                aria-label="Apply field filter"
                title="Apply field filter"
                className="h-10 w-10 min-h-10 shrink-0 px-0"
              >
                <Filter aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>

            {(dynamicFilterFieldType === 'date' || dynamicFilterFieldType === 'datetime') && (
              <p className="text-xs text-muted md:col-span-3 lg:col-span-4">
                Tip: You can use date presets like UPCOMING_SUNDAY, MONTH_JULY,
                YEAR_MONTH_2026_JULY, YEAR_2026, or PREVIOUS_3_WEEKS.
              </p>
            )}
          </>
        )}

        {isCustomJsonMode && (
          <div className="md:col-span-3 lg:col-span-4">
            <label className="flex flex-col gap-1 text-sm text-muted">
              <textarea
                value={customFilterJson}
                onChange={(event) => onCustomFilterJsonChange(event.target.value)}
                placeholder='{"expression":{"type":"group","op":"or","children":[{"type":"condition","filter":{"token":"registration:service","value":"9AM"}},{"type":"not","child":{"type":"condition","filter":{"token":"attendance:area","value":"North"}}}]}}'
                rows={5}
                className="rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onApplyCustomJson}
                disabled={customFilterJson.trim().length === 0}
              >
                Apply custom JSON filter
              </Button>
              <p className="text-xs text-muted">
                Supports arrays, dynamicFilterCombination/filters, or expression nodes
                (condition/group/not).
              </p>
            </div>
            {customFilterJsonError && (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {customFilterJsonError}
              </p>
            )}
          </div>
        )}
      </div>

      {dynamicFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 md:col-span-3">
          {dynamicFilters.map((filter) => {
            const token = toDynamicFieldToken(filter.field);
            return (
              <button
                key={`${token}:${filter.value}`}
                type="button"
                onClick={() => onRemoveDynamicFilter(token, filter.value)}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-text hover:border-primary"
                title="Remove filter"
              >
                {filter.field.label} ({filter.field.source}): {filter.value} x
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
