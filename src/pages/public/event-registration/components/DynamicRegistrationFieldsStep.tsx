import { type SubmitHandler, type UseFormReturn } from 'react-hook-form'
import { Button } from '../../../../components/ui/Button'
import type {
  DynamicFieldResponseValues,
  MemberLookupProfile,
  PublicEventField,
} from '../../../../lib/event-registration'
import { SectionCard } from '../../../../components/ui/SectionCard'
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

  return (
    <SectionCard title="Step 3: Complete Your Registration">
      {!matchedMember || isLocked ? (
        <p className="text-sm text-muted">
          {lockedMessage ?? 'Please complete Step 1 to continue.'}
        </p>
      ) : null}

      {matchedMember && !isLocked && isLoadingFields ? (
        <p className="mt-3 text-sm text-muted">Preparing your form...</p>
      ) : null}

      {matchedMember && !isLocked && isFieldsError ? (
        <p className="mt-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          We could not load your form right now. Please try Step 1 again.
        </p>
      ) : null}

      {matchedMember && !isLocked && fieldConfigIssues.length > 0 ? (
        <div className="mt-3 space-y-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <p>Some questions could not be shown right now.</p>
          {fieldConfigIssues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      ) : null}

      {matchedMember && !isLocked && !isLoadingFields && activeFields.length === 0 ? (
        <p className="mt-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-text">
          There are no form questions for this event yet.
        </p>
      ) : null}

      {matchedMember && !isLocked && activeFields.length > 0 ? (
        <form className="mt-4 space-y-4" onSubmit={dynamicForm.handleSubmit(onSubmit)} noValidate>
          {activeFields.map((field) => {
            const errorMessage = fieldErrorMessage(field.field_key)

            return (
              <div key={field.id} className="space-y-1">
                <label
                  className="text-sm font-medium text-text"
                  htmlFor={`field-${field.field_key}`}
                >
                  {field.label}
                  {field.is_required ? <span className="text-danger"> *</span> : null}
                </label>
                {field.help_text ? <p className="text-xs text-muted">{field.help_text}</p> : null}
                <DynamicFieldInput field={field} dynamicForm={dynamicForm} />
                {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}
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
        <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <p className="font-semibold">We could not submit your registration</p>
          <p className="mt-1">{submitErrorMessage}</p>
        </div>
      ) : null}

      {submitSuccessMessage ? (
        <div className="mt-4 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          <p className="font-semibold">You are all set!</p>
          <p className="mt-1">{submitSuccessMessage}</p>
        </div>
      ) : null}
    </SectionCard>
  )
}
