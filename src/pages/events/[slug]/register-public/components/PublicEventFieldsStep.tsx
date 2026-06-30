import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/SectionCard'
import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields'
import { buildDynamicFieldResponseSchema } from '@/lib/domain/event-fields'
import { renderFieldByType } from '@/pages/events/[slug]/register/components/field-renderers/index.tsx'

type PublicEventFieldsStepProps = {
  fields: PublicEventField[]
  onSubmit: (data: DynamicFieldResponseValues) => void
  onBack: () => void
  isSubmitting?: boolean
  errorMessage?: string
  defaultValues?: DynamicFieldResponseValues
}

export function PublicEventFieldsStep({
  fields,
  onSubmit,
  onBack,
  isSubmitting = false,
  errorMessage,
  defaultValues,
}: PublicEventFieldsStepProps) {
  const schema = buildDynamicFieldResponseSchema(fields)
  const dynamicForm = useForm<DynamicFieldResponseValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues,
  })

  return (
    <SectionCard title="Step 2: Event Details">
      <form onSubmit={dynamicForm.handleSubmit(onSubmit)} className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-danger bg-danger/10 p-4 text-sm text-danger">
            {errorMessage}
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

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Registration'}
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}
