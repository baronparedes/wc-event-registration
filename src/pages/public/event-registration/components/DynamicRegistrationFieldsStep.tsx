import { type SubmitHandler, type UseFormReturn } from 'react-hook-form'
import type {
  DynamicFieldResponseValues,
  MemberLookupProfile,
  PublicEventField,
} from '../../../../lib/event-registration'
import { SectionCard } from '../../../../components/ui/SectionCard'

const baseInputClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary'

function DynamicFieldInput(props: {
  field: PublicEventField
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>
}) {
  const { field, dynamicForm } = props

  switch (field.field_type) {
    case 'textarea':
      return (
        <textarea
          id={`field-${field.field_key}`}
          placeholder={field.placeholder ?? undefined}
          className={baseInputClassName}
          rows={4}
          {...dynamicForm.register(field.field_key)}
        />
      )

    case 'number':
      return (
        <input
          id={`field-${field.field_key}`}
          type="number"
          placeholder={field.placeholder ?? undefined}
          className={baseInputClassName}
          {...dynamicForm.register(field.field_key)}
        />
      )

    case 'email':
      return (
        <input
          id={`field-${field.field_key}`}
          type="email"
          placeholder={field.placeholder ?? undefined}
          className={baseInputClassName}
          {...dynamicForm.register(field.field_key)}
        />
      )

    case 'phone':
      return (
        <input
          id={`field-${field.field_key}`}
          type="tel"
          placeholder={field.placeholder ?? undefined}
          className={baseInputClassName}
          {...dynamicForm.register(field.field_key)}
        />
      )

    case 'date':
      return (
        <input
          id={`field-${field.field_key}`}
          type="date"
          className={baseInputClassName}
          {...dynamicForm.register(field.field_key)}
        />
      )

    case 'datetime':
      return (
        <input
          id={`field-${field.field_key}`}
          type="datetime-local"
          className={baseInputClassName}
          {...dynamicForm.register(field.field_key)}
        />
      )

    case 'select':
      return (
        <select
          id={`field-${field.field_key}`}
          className={baseInputClassName}
          {...dynamicForm.register(field.field_key)}
        >
          <option value="">Select an option</option>
          {field.options.map((option) => (
            <option key={`${field.id}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )

    case 'radio':
      return (
        <div className="space-y-2">
          {field.options.map((option) => (
            <label
              key={`${field.id}-${option.value}`}
              className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm text-text"
            >
              <input type="radio" value={option.value} {...dynamicForm.register(field.field_key)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )

    case 'multi_select':
      return (
        <div className="space-y-2">
          {field.options.map((option) => (
            <label
              key={`${field.id}-${option.value}`}
              className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm text-text"
            >
              <input
                type="checkbox"
                value={option.value}
                {...dynamicForm.register(field.field_key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )

    case 'checkbox':
    case 'boolean':
      return (
        <label
          htmlFor={`field-${field.field_key}`}
          className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm text-text"
        >
          <input
            id={`field-${field.field_key}`}
            type="checkbox"
            {...dynamicForm.register(field.field_key)}
          />
          <span>{field.placeholder ?? 'I confirm this statement.'}</span>
        </label>
      )

    case 'text':
    default:
      return (
        <input
          id={`field-${field.field_key}`}
          type="text"
          placeholder={field.placeholder ?? undefined}
          className={baseInputClassName}
          {...dynamicForm.register(field.field_key)}
        />
      )
  }
}

type DynamicFieldsStepCardProps = {
  matchedMember: MemberLookupProfile | null
  isLoadingFields: boolean
  isFieldsError: boolean
  fieldConfigIssues: string[]
  activeFields: PublicEventField[]
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>
  onSubmit: SubmitHandler<DynamicFieldResponseValues>
  fieldErrorMessage: (fieldKey: string) => string | undefined
  isSubmitPending: boolean
  submitErrorMessage: string | null
  submitSuccessMessage: string | null
}

export function DynamicFieldsStepCard(props: DynamicFieldsStepCardProps) {
  const {
    matchedMember,
    isLoadingFields,
    isFieldsError,
    fieldConfigIssues,
    activeFields,
    dynamicForm,
    onSubmit,
    fieldErrorMessage,
    isSubmitPending,
    submitErrorMessage,
    submitSuccessMessage,
  } = props

  return (
    <SectionCard title="Step 3: Complete Registration Fields">
      {!matchedMember ? (
        <p className="text-sm text-muted">
          Dynamic fields stay locked until member verification succeeds.
        </p>
      ) : null}

      {matchedMember && isLoadingFields ? (
        <p className="mt-3 text-sm text-muted">Loading registration fields...</p>
      ) : null}

      {matchedMember && isFieldsError ? (
        <p className="mt-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          Dynamic fields are unavailable right now. Please retry member verification.
        </p>
      ) : null}

      {matchedMember && fieldConfigIssues.length > 0 ? (
        <div className="mt-3 space-y-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <p>Some field configurations are invalid and were blocked for safety.</p>
          {fieldConfigIssues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      ) : null}

      {matchedMember && !isLoadingFields && activeFields.length === 0 ? (
        <p className="mt-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-text">
          This event has no active dynamic fields configured yet.
        </p>
      ) : null}

      {matchedMember && activeFields.length > 0 ? (
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

          <button
            type="submit"
            disabled={isSubmitPending}
            className="rounded-md bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitPending ? 'Submitting...' : 'Submit Registration'}
          </button>
        </form>
      ) : null}

      {submitErrorMessage ? (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <p className="font-semibold">Registration failed</p>
          <p className="mt-1">{submitErrorMessage}</p>
        </div>
      ) : null}

      {submitSuccessMessage ? (
        <div className="mt-4 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          <p className="font-semibold">Registration successful!</p>
          <p className="mt-1">{submitSuccessMessage}</p>
        </div>
      ) : null}
    </SectionCard>
  )
}
