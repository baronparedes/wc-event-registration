import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';

import { FormInputField } from '@/components/ui/FormInputField';
import { FormMarkdownField } from '@/components/ui/FormMarkdownField';
import { SectionCard } from '@/components/ui/SectionCard';
import { SlugField } from '@/components/ui/SlugField';
import type { CreateEventInput } from '@/lib/domain/events';

type EventDetailsSectionProps = {
  isEditMode: boolean;
  slugValue: string;
  errors: FieldErrors<CreateEventInput>;
  register: UseFormRegister<CreateEventInput>;
  control: Control<CreateEventInput>;
  onSlugChange: (value: string) => void;
  disabled?: boolean;
};

export function EventDetailsSection(props: EventDetailsSectionProps) {
  const { isEditMode, slugValue, errors, register, control, onSlugChange, disabled } = props;

  return (
    <SectionCard title="Event Details">
      <div className="space-y-4">
        <FormInputField
          disabled={disabled}
          error={typeof errors.title?.message === 'string' ? errors.title.message : undefined}
          id="event-title"
          label="Title"
          placeholder="e.g. Summer Camp 2025"
          registration={register('title')}
          required
        />

        <SlugField
          disabled={disabled}
          error={errors.slug?.message}
          isEditMode={isEditMode}
          onChange={onSlugChange}
          value={slugValue}
        />

        <FormMarkdownField
          control={control}
          name="description"
          label="Description"
          placeholder="Describe the event for participants..."
        />

        <FormInputField
          disabled={disabled}
          id="event-location"
          label="Location"
          placeholder="e.g. Main Hall, Building A"
          registration={register('location')}
        />
      </div>
    </SectionCard>
  );
}
