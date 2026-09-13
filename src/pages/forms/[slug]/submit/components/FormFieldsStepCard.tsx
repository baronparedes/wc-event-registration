import { AlertCircle } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { WizardStep } from '@/components/ui/WizardStep';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';
import { isFieldVisible } from '@/lib/domain/field-visibility';
import type { FormField } from '@/lib/domain/forms';
import { renderFieldByType } from '@/pages/events/[slug]/register/components/field-renderers/index.tsx';

import { toPublicField } from './field-helpers';

type FormFieldsStepCardProps = {
  fields: FormField[];
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>;
  onSubmit: (values: DynamicFieldResponseValues) => void;
  isSubmitting?: boolean;
  submitErrorMessage?: string | null;
  submitButtonLabel?: string;
  onBack?: () => void;
  inactivityTimeoutMs?: number;
  onInactivityTimeout?: () => void;
};

export function FormFieldsStepCard({
  fields,
  dynamicForm,
  onSubmit,
  isSubmitting = false,
  submitErrorMessage,
  submitButtonLabel = 'Submit Form',
  onBack,
  inactivityTimeoutMs,
  onInactivityTimeout,
}: FormFieldsStepCardProps) {
  const formValues = dynamicForm.watch();
  const publicFields = fields.map(toPublicField);

  const visibleFields = publicFields.filter((field) =>
    isFieldVisible(field, publicFields, formValues),
  );

  return (
    <WizardStep
      title="Step 2: Questions"
      inactivityTimeoutMs={inactivityTimeoutMs}
      onInactivityTimeout={onInactivityTimeout}
      inactivityTimerMessage={(s) => `Resetting form in ${s}s if inactive.`}
    >
      <form onSubmit={dynamicForm.handleSubmit(onSubmit)} className="space-y-6">
        {submitErrorMessage && (
          <div
            className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{submitErrorMessage}</p>
          </div>
        )}

        {visibleFields.length === 0 ? (
          <p className="text-sm text-muted">No questions required for this form.</p>
        ) : (
          <div className="space-y-5">
            {visibleFields.map((field) => {
              const errorMessage = dynamicForm.formState.errors[field.field_key]?.message;

              return (
                <div key={field.id} className="space-y-1.5">
                  <label
                    className="block text-sm font-medium text-text"
                    htmlFor={`field-${field.field_key}`}
                  >
                    {field.label}
                    {field.is_required && <span className="text-danger"> *</span>}
                  </label>
                  {field.help_text && <p className="text-xs text-muted">{field.help_text}</p>}
                  {renderFieldByType(field.field_type, field, dynamicForm)}
                  {errorMessage && <p className="text-sm text-danger">{String(errorMessage)}</p>}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-3 sm:flex-row">
          <Button
            className="w-full"
            disabled={isSubmitting}
            size="lg"
            type="submit"
            variant="default"
          >
            {isSubmitting ? 'Submitting...' : submitButtonLabel}
          </Button>

          {onBack && (
            <Button
              className="w-full sm:w-auto"
              disabled={isSubmitting}
              onClick={onBack}
              size="lg"
              type="button"
              variant="primaryOutline"
            >
              Back
            </Button>
          )}
        </div>
      </form>
    </WizardStep>
  );
}
