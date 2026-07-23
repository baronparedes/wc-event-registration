import { CheckCircle2, Info } from 'lucide-react';
import { type SubmitHandler, type UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { WizardStep } from '@/components/ui/WizardStep';
import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields';
import type { MemberLookupProfile } from '@/lib/domain/members';

import { CheckboxFieldRenderer } from './field-renderers/CheckboxFieldRenderer';
import { DateFieldRenderer, DatetimeFieldRenderer } from './field-renderers/DateFieldRenderer';
import {
  MultiSelectFieldRenderer,
  MultiSelectToggleFieldRenderer,
  RadioFieldRenderer,
  SelectFieldRenderer,
} from './field-renderers/SelectFieldRenderer';
import {
  ColorPickerFieldRenderer,
  EmailFieldRenderer,
  NumberFieldRenderer,
  PhoneFieldRenderer,
  TextFieldRenderer,
  TextareaFieldRenderer,
} from './field-renderers/TextFieldRenderer';

function DynamicFieldInput(props: {
  field: PublicEventField;
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>;
  memberRole?: string;
  remainingSlotsByOption?: Record<string, number>;
  remainingSlotsByRoleByOption?: Record<string, Record<string, number>>;
}) {
  const { field, dynamicForm, memberRole, remainingSlotsByOption, remainingSlotsByRoleByOption } =
    props;

  switch (field.field_type) {
    case 'textarea':
      return <TextareaFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'number':
      return <NumberFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'email':
      return <EmailFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'phone':
      return <PhoneFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'date':
      return <DateFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'datetime':
      return <DatetimeFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'select':
      return (
        <SelectFieldRenderer
          field={field}
          dynamicForm={dynamicForm}
          memberRole={memberRole}
          remainingSlotsByOption={remainingSlotsByOption}
          remainingSlotsByRoleByOption={remainingSlotsByRoleByOption}
        />
      );
    case 'radio':
      return (
        <RadioFieldRenderer
          field={field}
          dynamicForm={dynamicForm}
          memberRole={memberRole}
          remainingSlotsByOption={remainingSlotsByOption}
          remainingSlotsByRoleByOption={remainingSlotsByRoleByOption}
        />
      );
    case 'multi_select':
      return (
        <MultiSelectFieldRenderer
          field={field}
          dynamicForm={dynamicForm}
          memberRole={memberRole}
          remainingSlotsByOption={remainingSlotsByOption}
          remainingSlotsByRoleByOption={remainingSlotsByRoleByOption}
        />
      );
    case 'multi_select_toggle':
      return (
        <MultiSelectToggleFieldRenderer
          field={field}
          dynamicForm={dynamicForm}
          memberRole={memberRole}
          remainingSlotsByOption={remainingSlotsByOption}
          remainingSlotsByRoleByOption={remainingSlotsByRoleByOption}
        />
      );
    case 'checkbox':
    case 'boolean':
      return <CheckboxFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'color_picker':
      return <ColorPickerFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'text':
    default:
      return <TextFieldRenderer field={field} dynamicForm={dynamicForm} />;
  }
}

type DynamicFieldsStepCardProps = {
  matchedMember: MemberLookupProfile | null;
  isRegistrationConfirmed?: boolean;
  onConfirmAcknowledged?: () => void;
  isLocked?: boolean;
  shouldFadeLockedState?: boolean;
  lockedMessage?: string | null;
  onCancelUpdate?: () => void;
  isLoadingFields: boolean;
  isFieldsError: boolean;
  fieldConfigIssues: string[];
  activeFields: PublicEventField[];
  remainingSlotsByFieldOption?: Record<string, Record<string, number>>;
  remainingSlotsByRoleByFieldOption?: Record<string, Record<string, Record<string, number>>>;
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>;
  onSubmit: SubmitHandler<DynamicFieldResponseValues>;
  fieldErrorMessage: (fieldKey: string) => string | undefined;
  isSubmitPending: boolean;
  submitButtonLabel?: string;
  submitErrorMessage: string | null;
  submitSuccessMessage: string | null;
  /** Duration in ms for the fixed countdown after registration is confirmed. Requires onCountdownTimeout. */
  countdownMs?: number;
  /** Called when the post-confirm countdown expires. */
  onCountdownTimeout?: () => void;
  /** Duration in ms for the inactivity reset during form filling. Requires onInactivityTimeout. */
  inactivityTimeoutMs?: number;
  /** Called when the form inactivity timer expires. */
  onInactivityTimeout?: () => void;
};

export function DynamicFieldsStepCard(props: DynamicFieldsStepCardProps) {
  const {
    matchedMember,
    isRegistrationConfirmed = false,
    onConfirmAcknowledged,
    isLocked = false,
    shouldFadeLockedState = false,
    lockedMessage,
    onCancelUpdate,
    isLoadingFields,
    isFieldsError,
    fieldConfigIssues,
    activeFields,
    remainingSlotsByFieldOption,
    remainingSlotsByRoleByFieldOption,
    dynamicForm,
    onSubmit,
    fieldErrorMessage,
    isSubmitPending,
    submitButtonLabel = 'Submit Registration',
    submitErrorMessage,
    submitSuccessMessage,
    countdownMs,
    onCountdownTimeout,
    inactivityTimeoutMs,
    onInactivityTimeout,
  } = props;

  const shouldShowDefaultLockedMessage = !matchedMember || shouldFadeLockedState;
  const shouldShowBlockedLockedMessage = matchedMember && isLocked && !shouldFadeLockedState;

  return (
    <WizardStep
      title="Step 3: Complete Your Registration"
      countdownMs={countdownMs}
      onCountdownTimeout={onCountdownTimeout}
      isCountdownActive={isRegistrationConfirmed}
      countdownTimerMessage={(s) => `Returning to Step 1 in ${s}s.`}
      inactivityTimeoutMs={inactivityTimeoutMs}
      onInactivityTimeout={onInactivityTimeout}
      isInactivityTimerActive={Boolean(matchedMember && !isLocked && !isRegistrationConfirmed)}
      inactivityTimerMessage={(s) => `Returning to Step 1 in ${s}s if this step is not completed.`}
    >
      <div className="space-y-2">
        <div
          className={`overflow-hidden transition-all duration-500 ${
            shouldShowBlockedLockedMessage
              ? 'max-h-16 opacity-100 translate-y-0'
              : 'max-h-0 opacity-0 -translate-y-1'
          }`}
        >
          <p className="registration-locked-copy text-sm text-muted">
            {lockedMessage ?? 'Please complete Step 1 to continue.'}
          </p>
        </div>

        <div
          className={`overflow-hidden transition-all duration-500 ${
            shouldShowDefaultLockedMessage
              ? 'max-h-16 opacity-100 translate-y-0'
              : 'max-h-0 opacity-0 -translate-y-1'
          }`}
        >
          <p className="registration-locked-copy text-sm text-muted">
            Please complete Step 1 to continue.
          </p>
        </div>
      </div>

      {matchedMember && !isLocked && isLoadingFields && (
        <div className="mt-4 space-y-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`field-skeleton-${index}`} className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-44" />
        </div>
      )}

      {matchedMember && !isLocked && isFieldsError && (
        <p className="registration-status-panel mt-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          We could not load your form right now. Please try Step 1 again.
        </p>
      )}

      {matchedMember && !isLocked && fieldConfigIssues.length > 0 && (
        <div className="registration-status-panel mt-3 space-y-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <p>Some questions could not be shown right now.</p>
          {fieldConfigIssues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      )}

      {isRegistrationConfirmed && submitSuccessMessage && (
        <div className="mt-4 space-y-3 text-center">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-text">Registration Confirmed!</h2>
            <p className="text-muted">Thank you for registering.</p>
          </div>

          <div
            aria-live="polite"
            className="registration-status-panel flex items-start gap-3 rounded-lg border-2 border-green-600 bg-green-100 px-4 py-3 text-green-950 shadow-md"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white ring-1 ring-green-800/30"
            >
              !
            </span>
            <div className="space-y-1">
              <p className="registration-status-message text-sm font-medium text-green-900">
                {submitSuccessMessage}
              </p>
            </div>
          </div>

          {onConfirmAcknowledged && (
            <Button
              className="w-full"
              onClick={onConfirmAcknowledged}
              size="lg"
              type="button"
              variant="default"
            >
              Ok
            </Button>
          )}
        </div>
      )}

      {matchedMember && !isLocked && !isLoadingFields && !isRegistrationConfirmed && (
        <form className="mt-4 space-y-4" onSubmit={dynamicForm.handleSubmit(onSubmit)} noValidate>
          {activeFields.length === 0 && (
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

          {activeFields.length > 0 &&
            activeFields.map((field) => {
              const errorMessage = fieldErrorMessage(field.field_key);

              return (
                <div key={field.id} className="space-y-1">
                  <label
                    className="registration-field-label text-sm font-medium text-text"
                    htmlFor={`field-${field.field_key}`}
                  >
                    {field.label}
                    {field.is_required && <span className="text-danger"> *</span>}
                  </label>
                  {field.help_text && (
                    <p className="registration-field-help text-xs text-muted">{field.help_text}</p>
                  )}
                  <DynamicFieldInput
                    field={field}
                    dynamicForm={dynamicForm}
                    memberRole={matchedMember.role}
                    remainingSlotsByOption={remainingSlotsByFieldOption?.[field.field_key]}
                    remainingSlotsByRoleByOption={
                      remainingSlotsByRoleByFieldOption?.[field.field_key]
                    }
                  />
                  {errorMessage && (
                    <p className="registration-field-error text-sm text-danger">{errorMessage}</p>
                  )}
                </div>
              );
            })}

          <div className="flex w-full flex-col gap-2">
            <Button
              className="w-full"
              disabled={isSubmitPending}
              size="lg"
              type="submit"
              variant="default"
            >
              {isSubmitPending ? `${submitButtonLabel}...` : submitButtonLabel}
            </Button>

            {onCancelUpdate && (
              <Button
                className="w-full hover:bg-surface"
                disabled={isSubmitPending}
                onClick={onCancelUpdate}
                size="lg"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}

      {submitErrorMessage && (
        <div className="registration-status-panel mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <p className="font-semibold">We could not submit your registration</p>
          <p className="mt-1">{submitErrorMessage}</p>
        </div>
      )}

      {matchedMember && submitSuccessMessage && !isRegistrationConfirmed && (
        <div className="registration-status-panel mt-4 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          <p className="font-semibold">You are all set!</p>
          <p className="mt-1">{submitSuccessMessage}</p>
        </div>
      )}
    </WizardStep>
  );
}
