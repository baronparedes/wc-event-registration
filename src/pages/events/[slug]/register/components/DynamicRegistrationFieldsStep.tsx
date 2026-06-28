import { type SubmitHandler, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields'
import type { MemberLookupProfile } from '@/lib/domain/members'
import { SectionCard } from '@/components/ui/SectionCard'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  TextFieldRenderer,
  EmailFieldRenderer,
  PhoneFieldRenderer,
  NumberFieldRenderer,
  TextareaFieldRenderer,
} from './field-renderers/TextFieldRenderer'
import { DateFieldRenderer, DatetimeFieldRenderer } from './field-renderers/DateFieldRenderer'
import {
  SelectFieldRenderer,
  RadioFieldRenderer,
  MultiSelectFieldRenderer,
} from './field-renderers/SelectFieldRenderer'
import { CheckboxFieldRenderer } from './field-renderers/CheckboxFieldRenderer'

function DynamicFieldInput(props: {
  field: PublicEventField
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>
}) {
  const { field, dynamicForm } = props

  switch (field.field_type) {
    case 'textarea':
      return <TextareaFieldRenderer field={field} dynamicForm={dynamicForm} />
    case 'number':
      return <NumberFieldRenderer field={field} dynamicForm={dynamicForm} />
    case 'email':
      return <EmailFieldRenderer field={field} dynamicForm={dynamicForm} />
    case 'phone':
      return <PhoneFieldRenderer field={field} dynamicForm={dynamicForm} />
    case 'date':
      return <DateFieldRenderer field={field} dynamicForm={dynamicForm} />
    case 'datetime':
      return <DatetimeFieldRenderer field={field} dynamicForm={dynamicForm} />
    case 'select':
      return <SelectFieldRenderer field={field} dynamicForm={dynamicForm} />
    case 'radio':
      return <RadioFieldRenderer field={field} dynamicForm={dynamicForm} />
    case 'multi_select':
      return <MultiSelectFieldRenderer field={field} dynamicForm={dynamicForm} />
    case 'checkbox':
    case 'boolean':
      return <CheckboxFieldRenderer field={field} dynamicForm={dynamicForm} />
    case 'text':
    default:
      return <TextFieldRenderer field={field} dynamicForm={dynamicForm} />
  }
}

type DynamicFieldsStepCardProps = {
  matchedMember: MemberLookupProfile | null
  isLocked?: boolean
  shouldFadeLockedState?: boolean
  lockedMessage?: string | null
  onCancelUpdate?: () => void
  isLoadingFields: boolean
  isFieldsError: boolean
  fieldConfigIssues: string[]
  activeFields: PublicEventField[]
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>
  onSubmit: SubmitHandler<DynamicFieldResponseValues>
  fieldErrorMessage: (fieldKey: string) => string | undefined
  isSubmitPending: boolean
  submitButtonLabel?: string
  submitErrorMessage: string | null
  submitSuccessMessage: string | null
}

export function DynamicFieldsStepCard(props: DynamicFieldsStepCardProps) {
  const {
    matchedMember,
    isLocked = false,
    shouldFadeLockedState = false,
    lockedMessage,
    onCancelUpdate,
    isLoadingFields,
    isFieldsError,
    fieldConfigIssues,
    activeFields,
    dynamicForm,
    onSubmit,
    fieldErrorMessage,
    isSubmitPending,
    submitButtonLabel = 'Submit Registration',
    submitErrorMessage,
    submitSuccessMessage,
  } = props

  const shouldShowDefaultLockedMessage = !matchedMember || shouldFadeLockedState
  const shouldShowBlockedLockedMessage = matchedMember && isLocked && !shouldFadeLockedState

  return (
    <SectionCard
      title="Step 3: Complete Your Registration"
      wrapperClassName="registration-step-card rounded-2xl border border-border bg-surface p-6 shadow-sm"
      titleClassName="registration-step-card__title font-heading text-xl font-semibold text-text"
      contentClassName="registration-step-card__content mt-2"
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

      {matchedMember && !isLocked && isLoadingFields ? (
        <div className="mt-4 space-y-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`field-skeleton-${index}`} className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-44" />
        </div>
      ) : null}

      {matchedMember && !isLocked && isFieldsError ? (
        <p className="registration-status-panel mt-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          We could not load your form right now. Please try Step 1 again.
        </p>
      ) : null}

      {matchedMember && !isLocked && fieldConfigIssues.length > 0 ? (
        <div className="registration-status-panel mt-3 space-y-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <p>Some questions could not be shown right now.</p>
          {fieldConfigIssues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      ) : null}

      {matchedMember && !isLocked && !isLoadingFields && activeFields.length === 0 ? (
        <p className="registration-status-panel mt-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-text">
          There are no form questions for this event yet.
        </p>
      ) : null}

      {matchedMember && !isLocked && !isLoadingFields && activeFields.length > 0 ? (
        <form className="mt-4 space-y-4" onSubmit={dynamicForm.handleSubmit(onSubmit)} noValidate>
          {activeFields.map((field) => {
            const errorMessage = fieldErrorMessage(field.field_key)

            return (
              <div key={field.id} className="space-y-1">
                <label
                  className="registration-field-label text-sm font-medium text-text"
                  htmlFor={`field-${field.field_key}`}
                >
                  {field.label}
                  {field.is_required ? <span className="text-danger"> *</span> : null}
                </label>
                {field.help_text ? (
                  <p className="registration-field-help text-xs text-muted">{field.help_text}</p>
                ) : null}
                <DynamicFieldInput field={field} dynamicForm={dynamicForm} />
                {errorMessage ? (
                  <p className="registration-field-error text-sm text-danger">{errorMessage}</p>
                ) : null}
              </div>
            )
          })}

          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={isSubmitPending} size="md" type="submit" variant="default">
              {isSubmitPending ? `${submitButtonLabel}...` : submitButtonLabel}
            </Button>

            {onCancelUpdate ? (
              <Button
                className="hover:bg-surface"
                disabled={isSubmitPending}
                onClick={onCancelUpdate}
                size="md"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {submitErrorMessage ? (
        <div className="registration-status-panel mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <p className="font-semibold">We could not submit your registration</p>
          <p className="mt-1">{submitErrorMessage}</p>
        </div>
      ) : null}

      {matchedMember && submitSuccessMessage ? (
        <div className="registration-status-panel mt-4 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          <p className="font-semibold">You are all set!</p>
          <p className="mt-1">{submitSuccessMessage}</p>
        </div>
      ) : null}
    </SectionCard>
  )
}
