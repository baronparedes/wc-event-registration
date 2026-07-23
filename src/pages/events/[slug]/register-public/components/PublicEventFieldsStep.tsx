import { useEffect, useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { WizardStep } from '@/components/ui/WizardStep';
import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields';
import { buildDynamicFieldResponseSchema } from '@/lib/domain/event-fields';
import { renderFieldByType } from '@/pages/events/[slug]/register/components/field-renderers/index.tsx';

function normalizeHydratedValueForField(
  value: unknown,
  fieldType: PublicEventField['field_type'],
): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (fieldType === 'text' || fieldType === 'textarea' || fieldType === 'email') {
    return value === null ? '' : String(value);
  }

  if (fieldType === 'phone' || fieldType === 'date' || fieldType === 'datetime') {
    return value === null ? '' : String(value);
  }

  if (fieldType === 'select' || fieldType === 'radio') {
    return value === null ? '' : String(value);
  }

  if (fieldType === 'number') {
    if (value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    return String(value);
  }

  if (fieldType === 'checkbox' || fieldType === 'boolean') {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lowered = value.trim().toLowerCase();
      if (lowered === 'true' || lowered === '1' || lowered === 'yes') {
        return true;
      }

      if (lowered === 'false' || lowered === '0' || lowered === 'no') {
        return false;
      }
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    return Boolean(value);
  }

  if (fieldType === 'multi_select') {
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }

    if (value === null || value === '') {
      return [];
    }

    return [String(value)];
  }

  if (fieldType === 'multi_select_toggle') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        entryValue === null ? null : Boolean(entryValue),
      ]),
    );
  }

  return value;
}

function buildNormalizedDefaultValues(
  fields: PublicEventField[],
  defaultValues?: DynamicFieldResponseValues,
): DynamicFieldResponseValues {
  const normalized: DynamicFieldResponseValues = {};

  if (!defaultValues) {
    return normalized;
  }

  for (const field of fields) {
    if (!(field.field_key in defaultValues)) {
      continue;
    }

    normalized[field.field_key] = normalizeHydratedValueForField(
      defaultValues[field.field_key],
      field.field_type,
    );
  }

  return normalized;
}

type PublicEventFieldsStepProps = {
  fields: PublicEventField[];
  onSubmit: (data: DynamicFieldResponseValues) => void;
  onBack: () => void;
  isSubmitting?: boolean;
  errorMessage?: string;
  defaultValues?: DynamicFieldResponseValues;
  inactivityTimeoutMs?: number;
  onInactivityTimeout?: () => void;
};

export function PublicEventFieldsStep({
  fields,
  onSubmit,
  onBack,
  isSubmitting = false,
  errorMessage,
  defaultValues,
  inactivityTimeoutMs,
  onInactivityTimeout,
}: PublicEventFieldsStepProps) {
  const schema = buildDynamicFieldResponseSchema(fields);
  const lastAppliedDefaultsRef = useRef<string>('');

  const dynamicForm = useForm<DynamicFieldResponseValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {},
  });

  useEffect(() => {
    const normalizedDefaultValues = buildNormalizedDefaultValues(fields, defaultValues);
    const serializedDefaults = JSON.stringify(normalizedDefaultValues);

    if (serializedDefaults === lastAppliedDefaultsRef.current) {
      return;
    }

    lastAppliedDefaultsRef.current = serializedDefaults;
    dynamicForm.reset(normalizedDefaultValues);
  }, [dynamicForm, fields, defaultValues]);

  return (
    <WizardStep
      title="Step 2: Event Details"
      inactivityTimeoutMs={inactivityTimeoutMs}
      onInactivityTimeout={onInactivityTimeout}
      inactivityTimerMessage={(s) =>
        `Returning to member registration in ${s}s if no one continues.`
      }
    >
      <form onSubmit={dynamicForm.handleSubmit(onSubmit)} className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-danger bg-danger/10 p-4 text-sm text-danger">
            {errorMessage}
          </div>
        )}

        {fields.length === 0 && (
          <div
            aria-live="polite"
            className="registration-status-panel flex items-start gap-3 rounded-lg border-2 border-blue-600 bg-blue-100 px-4 py-3 text-sm text-blue-950 shadow-md"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary text-white ring-1 ring-primary/30"
            >
              <Info className="h-3.5 w-3.5" />
            </span>
            <div className="space-y-1">
              <p className="registration-status-title text-base font-semibold leading-6">
                Tap "Submit Registration" to confirm your attendance for this event.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="mb-2 block text-sm font-medium text-text">
                {field.label}
                {field.is_required && <span className="text-danger">*</span>}
              </label>
              {field.help_text && <p className="mb-2 text-xs text-muted">{field.help_text}</p>}
              {renderFieldByType(field.field_type, field, dynamicForm)}
              {dynamicForm.formState.errors[field.field_key] && (
                <p className="mt-1 text-xs text-danger">
                  {dynamicForm.formState.errors[field.field_key]?.message as string}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button className="w-full" type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? 'Submitting...' : 'Submit Registration'}
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
            size="lg"
          >
            Back
          </Button>
        </div>
      </form>
    </WizardStep>
  );
}
