import type { DynamicFieldDomain, DynamicFieldType } from '@/lib/domain/dynamic-fields';
import { DYNAMIC_FIELD_TYPE_LABELS, getFieldTypesForDomain } from '@/lib/domain/dynamic-fields';

export interface DynamicFieldTypeSelectorProps {
  value: DynamicFieldType;
  onChange: (type: DynamicFieldType) => void;
  domain?: DynamicFieldDomain;
  disabled?: boolean;
  error?: string | null;
}

/**
 * Reusable dynamic field type selector grid powered by the centralized field registry.
 */
export function DynamicFieldTypeSelector({
  value,
  onChange,
  domain,
  disabled,
  error,
}: DynamicFieldTypeSelectorProps) {
  const fieldTypes = domain ? getFieldTypesForDomain(domain) : getFieldTypesForDomain('events');

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {fieldTypes.map((type) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type)}
            className={`rounded-lg border p-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              value === type
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-border bg-background text-text hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            {DYNAMIC_FIELD_TYPE_LABELS[type] ?? type}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
