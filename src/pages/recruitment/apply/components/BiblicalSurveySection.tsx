import { type UseFormReturn, useWatch } from 'react-hook-form';

import { DynamicFieldRenderer } from '@/components/fields';
import type { DynamicFieldLike, DynamicFieldResponseValues } from '@/lib/domain/dynamic-fields';
import { isFieldVisible } from '@/lib/domain/field-visibility';

type BiblicalSurveySectionProps = {
  fields: DynamicFieldLike[];
  form: UseFormReturn<DynamicFieldResponseValues>;
};

function hasAnswer(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

export function BiblicalSurveySection({ fields, form }: BiblicalSurveySectionProps) {
  const values = useWatch({ control: form.control }) ?? {};
  const visibleFields = fields.filter((field) => isFieldVisible(field, fields, values));
  const answeredCount = visibleFields.filter((field) => hasAnswer(values[field.field_key])).length;

  return (
    <section className="space-y-5" aria-labelledby="biblical-survey-heading">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="biblical-survey-heading" className="text-xl font-semibold text-text">
            Biblical Survey
          </h2>
          <p className="mt-1 text-sm text-muted">Answer each active statement as True or False.</p>
        </div>
        <p aria-live="polite" className="text-sm font-medium text-text">
          {answeredCount} / {fields.length} answered
        </p>
      </header>
      <div className="space-y-5">
        {visibleFields.map((field) => {
          const error = form.formState.errors[field.field_key]?.message;
          return (
            <div
              key={field.field_key}
              data-field-key={field.field_key}
              data-field-error={error ? field.field_key : undefined}
              className="border-b border-border pb-5 last:border-0"
            >
              <label
                className="mb-2 block text-sm font-medium text-text"
                htmlFor={`field-${field.field_key}`}
              >
                {field.label}
                {field.is_required && <span className="text-danger"> *</span>}
              </label>
              {field.help_text && <p className="mb-2 text-xs text-muted">{field.help_text}</p>}
              <DynamicFieldRenderer
                field={field}
                dynamicForm={form}
                radioOptionsLayout="responsive-row"
              />
              {error && <p className="mt-1 text-sm text-danger">{String(error)}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
