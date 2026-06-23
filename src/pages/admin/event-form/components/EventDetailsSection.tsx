import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { CreateEventInput } from '../../../../lib/admin/eventSchema'
import { FormInputField } from '../../../../components/ui/FormInputField'
import { FormTextareaField } from '../../../../components/ui/FormTextareaField'
import { SectionCard } from '../../../../components/ui/SectionCard'
import { SlugField } from '../../../../components/ui/SlugField'

type EventDetailsSectionProps = {
  isEditMode: boolean
  slugValue: string
  errors: FieldErrors<CreateEventInput>
  register: UseFormRegister<CreateEventInput>
  onSlugChange: (value: string) => void
}

export function EventDetailsSection(props: EventDetailsSectionProps) {
  const { isEditMode, slugValue, errors, register, onSlugChange } = props

  return (
    <SectionCard title="Event Details">
      <div className="space-y-4">
        <FormInputField
          error={typeof errors.title?.message === 'string' ? errors.title.message : null}
          id="event-title"
          label="Title"
          placeholder="e.g. Summer Camp 2025"
          registration={register('title')}
          required
        />

        <SlugField
          error={errors.slug?.message}
          isEditMode={isEditMode}
          onChange={onSlugChange}
          value={slugValue}
        />

        <FormTextareaField
          id="event-description"
          label="Description"
          placeholder="Describe the event for participants..."
          registration={register('description')}
          rows={4}
        />

        <FormInputField
          id="event-location"
          label="Location"
          placeholder="e.g. Main Hall, Building A"
          registration={register('location')}
        />
      </div>
    </SectionCard>
  )
}
