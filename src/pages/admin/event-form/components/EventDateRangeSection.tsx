import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { CreateEventInput } from '../../../../lib/admin/eventSchema'
import { FormInputField } from '../../../../components/ui/FormInputField'
import { SectionCard } from '../../../../components/ui/SectionCard'

type DateFieldName = 'starts_at' | 'ends_at' | 'registration_opens_at' | 'registration_closes_at'

type EventDateRangeSectionProps = {
  title: string
  startName: DateFieldName
  startLabel: string
  startId: string
  endName: DateFieldName
  endLabel: string
  endId: string
  errors: FieldErrors<CreateEventInput>
  register: UseFormRegister<CreateEventInput>
  disabled?: boolean
}

function getErrorMessage(
  errors: FieldErrors<CreateEventInput>,
  name: DateFieldName,
): string | null {
  const message = errors[name]?.message
  return typeof message === 'string' ? message : null
}

export function EventDateRangeSection(props: EventDateRangeSectionProps) {
  const {
    title,
    startName,
    startLabel,
    startId,
    endName,
    endLabel,
    endId,
    errors,
    register,
    disabled,
  } = props

  const startError = getErrorMessage(errors, startName)
  const endError = getErrorMessage(errors, endName)

  return (
    <SectionCard title={title}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormInputField
          disabled={disabled}
          error={startError}
          id={startId}
          label={startLabel}
          registration={register(startName)}
          type="datetime-local"
        />

        <FormInputField
          disabled={disabled}
          error={endError}
          id={endId}
          label={endLabel}
          registration={register(endName)}
          type="datetime-local"
        />
      </div>
    </SectionCard>
  )
}
