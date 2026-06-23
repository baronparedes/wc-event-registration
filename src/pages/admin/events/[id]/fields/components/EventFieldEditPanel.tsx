import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  eventFieldFormSchema,
  DEFAULT_FIELD_FORM_VALUES,
  fieldToFormValues,
  toValidationRules,
  fieldTypeHasOptions,
  fieldTypeHasTextValidation,
  fieldTypeHasNumberValidation,
  fieldTypeHasMultiSelectValidation,
  fieldTypeHasDateValidation,
  fieldTypeHasValidation,
} from '@/lib/admin/eventFieldSchema'
import type { EventFieldFormValues, EventFieldTypeEnum } from '@/lib/admin/eventFieldSchema'
import type { AdminEventField, EventStatus } from '@/lib/admin/types'
import {
  useCreateEventFieldMutation,
  useUpdateEventFieldMutation,
} from '@/hooks/domain/event-fields'
import { PanelHeader } from './PanelHeader'
import { StatusBanners } from './StatusBanners'
import { FieldTypeSection } from './FieldTypeSection'
import { FieldDetailsSection } from './FieldDetailsSection'
import { DisplayTextSection } from './DisplayTextSection'
import { OptionsSection } from './OptionsSection'
import { ValidationRulesSection } from './ValidationRulesSection'
import { PanelFooter } from './PanelFooter'

type EventFieldEditPanelProps = {
  eventId: string
  eventStatus: EventStatus
  field: AdminEventField | null
  onClose: () => void
}

/** Modal panel for creating or editing a registration form field. */
export function EventFieldEditPanel({
  eventId,
  eventStatus,
  field,
  onClose,
}: EventFieldEditPanelProps) {
  const isEditing = field !== null
  const isPublished = eventStatus === 'published'
  const isArchived = eventStatus === 'archived'
  const isFullyLocked = isArchived
  const isStructurallyLocked = isPublished || isArchived

  const createMutation = useCreateEventFieldMutation()
  const updateMutation = useUpdateEventFieldMutation()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isDirty, isValid },
  } = useForm<EventFieldFormValues>({
    resolver: zodResolver(eventFieldFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: field ? fieldToFormValues(field) : DEFAULT_FIELD_FORM_VALUES,
  })

  const { fields: optionFields, append, remove } = useFieldArray({ control, name: 'options' })

  const selectedFieldType = watch('field_type') as EventFieldTypeEnum
  const showOptions = fieldTypeHasOptions(selectedFieldType)
  const showTextValidation = fieldTypeHasTextValidation(selectedFieldType)
  const showNumberValidation = fieldTypeHasNumberValidation(selectedFieldType)
  const showMultiSelectValidation = fieldTypeHasMultiSelectValidation(selectedFieldType)
  const showDateValidation = fieldTypeHasDateValidation(selectedFieldType)
  const showValidationSection = fieldTypeHasValidation(selectedFieldType)

  function handleTypeSelect(type: EventFieldTypeEnum) {
    setValue('field_type', type, { shouldDirty: true, shouldValidate: true })
    // Reset type-specific fields when field type changes
    setValue('options', [])
    setValue('val_min_length', '')
    setValue('val_max_length', '')
    setValue('val_pattern', '')
    setValue('val_min', '')
    setValue('val_max', '')
    setValue('val_min_selections', '')
    setValue('val_max_selections', '')
    setValue('val_min_date', '')
    setValue('val_max_date', '')
  }

  async function onSubmit(values: EventFieldFormValues) {
    try {
      const validationRules = toValidationRules(values)

      if (isEditing && field) {
        const updatePayload = isPublished
          ? // Published: only cosmetic fields
            {
              id: field.id,
              event_id: eventId,
              label: values.label,
              placeholder: values.placeholder || null,
              help_text: values.help_text || null,
            }
          : // Draft: all fields
            {
              id: field.id,
              event_id: eventId,
              label: values.label,
              is_required: values.is_required,
              is_active: values.is_active,
              placeholder: values.placeholder || null,
              help_text: values.help_text || null,
              options: showOptions ? values.options : [],
              validation_rules: validationRules,
            }

        await updateMutation.mutateAsync(updatePayload)
        toast.success('Field updated.')
      } else {
        await createMutation.mutateAsync({
          event_id: eventId,
          field_key: values.field_key,
          label: values.label,
          field_type: values.field_type,
          is_required: values.is_required,
          is_active: values.is_active,
          placeholder: values.placeholder || null,
          help_text: values.help_text || null,
          options: showOptions ? values.options : [],
          validation_rules: validationRules,
          display_order: 0,
        })
        toast.success('Field added.')
      }
      onClose()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again or contact support.'
      toast.error(message)
    }
  }

  const canSave = isDirty && isValid && !isFullyLocked && !isPending
  const disabledHint = (() => {
    if (isPending) return 'Save in progress.'
    if (errors.field_key?.message) return `Field Name: ${errors.field_key.message}`
    if (errors.label?.message) return `Field Label: ${errors.label.message}`
    if (errors.field_type?.message) return `Field Type: ${errors.field_type.message}`
    if (!isDirty) return 'Make at least one change to enable saving.'
    if (!isValid) return 'Fix the validation errors above.'
    return null
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <PanelHeader isEditing={isEditing} onClose={onClose} />
        <StatusBanners eventStatus={eventStatus} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
          {/* Hidden input for field_type validation */}
          <input type="hidden" {...register('field_type')} />

          <FieldTypeSection
            isEditing={isEditing}
            isFullyLocked={isFullyLocked}
            selectedFieldType={selectedFieldType}
            onTypeSelect={handleTypeSelect}
            fieldTypeRegistration={register('field_type')}
            error={errors.field_type?.message}
          />

          <FieldDetailsSection
            isEditing={isEditing}
            isFullyLocked={isFullyLocked}
            isStructurallyLocked={isStructurallyLocked}
            field={field}
            fieldKeyRegistration={register('field_key')}
            labelRegistration={register('label')}
            isRequiredRegistration={register('is_required')}
            isActiveRegistration={register('is_active')}
            errors={errors}
          />

          <DisplayTextSection
            isFullyLocked={isFullyLocked}
            placeholderRegistration={register('placeholder')}
            helpTextRegistration={register('help_text')}
            errors={errors}
          />

          {showOptions && (
            <OptionsSection
              isStructurallyLocked={isStructurallyLocked}
              optionFields={optionFields}
              register={register}
              errors={errors}
              append={append}
              remove={remove}
            />
          )}

          {showValidationSection && (
            <ValidationRulesSection
              isStructurallyLocked={isStructurallyLocked}
              showTextValidation={showTextValidation}
              showNumberValidation={showNumberValidation}
              showMultiSelectValidation={showMultiSelectValidation}
              showDateValidation={showDateValidation}
              register={register}
            />
          )}

          <PanelFooter
            isFullyLocked={isFullyLocked}
            isEditing={isEditing}
            canSave={canSave}
            isPending={isPending}
            disabledHint={disabledHint}
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  )
}
