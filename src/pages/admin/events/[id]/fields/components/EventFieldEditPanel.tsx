import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Dialog } from '@/components/ui/Dialog';
import {
  useAdminEventFieldsQuery,
  useCreateEventFieldMutation,
  useUpdateEventFieldMutation,
} from '@/hooks/domain/event-fields';
import {
  DEFAULT_FIELD_FORM_VALUES,
  eventFieldFormSchema,
  fieldToFormValues,
  fieldTypeHasDateValidation,
  fieldTypeHasMultiSelectValidation,
  fieldTypeHasNumberValidation,
  fieldTypeHasOptions,
  fieldTypeHasTextValidation,
  fieldTypeHasValidation,
  toValidationRules,
} from '@/lib/domain/event-fields';
import type {
  AdminEventField,
  EventFieldApplicability,
  EventFieldFormValues,
  EventFieldTypeEnum,
} from '@/lib/domain/event-fields';
import type { EventStatus } from '@/lib/domain/events';

import { DisplayTextSection } from './DisplayTextSection';
import { FieldDetailsSection } from './FieldDetailsSection';
import { FieldTypeSection } from './FieldTypeSection';
import { OptionsSection } from './OptionsSection';
import { PanelFooter } from './PanelFooter';
import { StatusBanners } from './StatusBanners';
import { ValidationRulesSection } from './ValidationRulesSection';
import { VisibilityRuleSection } from './VisibilityRuleSection';

type EventFieldEditPanelProps = {
  eventId: string;
  eventStatus: EventStatus;
  field: AdminEventField | null;
  onClose: () => void;
};

/** Modal panel for creating or editing a registration form field. */
export function EventFieldEditPanel({
  eventId,
  eventStatus,
  field,
  onClose,
}: EventFieldEditPanelProps) {
  const isEditing = field !== null;
  const isPublished = eventStatus === 'published';
  const isArchived = eventStatus === 'archived';
  const isFullyLocked = isArchived;
  const isStructurallyLocked = isPublished || isArchived;
  const isOptionStructureLocked = isPublished || isArchived;
  const isCapacityLocked = isArchived;

  const { data: allFields = [] } = useAdminEventFieldsQuery(eventId);
  const availableParentFields = allFields.filter((f) => f.field_key !== (field?.field_key ?? ''));

  const createMutation = useCreateEventFieldMutation();
  const updateMutation = useUpdateEventFieldMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty, isValid },
  } = useForm<EventFieldFormValues>({
    resolver: zodResolver(eventFieldFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: field ? fieldToFormValues(field) : DEFAULT_FIELD_FORM_VALUES,
  });

  const { fields: optionFields, append, remove } = useFieldArray({ control, name: 'options' });

  const selectedFieldType = useWatch({ control, name: 'field_type' }) as EventFieldTypeEnum;
  const selectedApplicability =
    (useWatch({ control, name: 'applicability' }) as EventFieldApplicability | undefined) ?? 'both';
  const dependsOnFieldKey =
    (useWatch({ control, name: 'val_visibility_depends_on_field_key' }) as string | undefined) ??
    '';
  const showOptions = fieldTypeHasOptions(selectedFieldType);
  const showTextValidation = fieldTypeHasTextValidation(selectedFieldType);
  const showNumberValidation = fieldTypeHasNumberValidation(selectedFieldType);
  const showMultiSelectValidation = fieldTypeHasMultiSelectValidation(selectedFieldType);
  const showDateValidation = fieldTypeHasDateValidation(selectedFieldType);
  const showValidationSection = fieldTypeHasValidation(selectedFieldType);

  function handleTypeSelect(type: EventFieldTypeEnum) {
    setValue('field_type', type, { shouldDirty: true, shouldValidate: true });
    // Reset type-specific fields when field type changes
    setValue('options', []);
    setValue('val_min_length', '');
    setValue('val_max_length', '');
    setValue('val_pattern', '');
    setValue('val_min', '');
    setValue('val_max', '');
    setValue('val_min_selections', '');
    setValue('val_max_selections', '');
    setValue('val_min_date', '');
    setValue('val_max_date', '');
    setValue('val_max_past_days', '');
    setValue('val_allowed_weekdays', []);
  }

  async function onSubmit(values: EventFieldFormValues) {
    const validationRules = toValidationRules(values);
    const normalizedOptions = showOptions
      ? values.options.map((option) => ({
          label: option.label,
          value: option.value,
          toggle_label: option.toggle_label,
          ...(option.toggle_default !== undefined ? { toggle_default: option.toggle_default } : {}),
        }))
      : [];

    const placeholder = values.placeholder || null;
    const helpText = values.help_text || null;

    let updatePayload: Parameters<typeof updateMutation.mutateAsync>[0] | null = null;
    if (isEditing && field) {
      const publishedCapacityRules: Record<string, unknown> = {};
      if (validationRules.max_slots !== undefined) {
        publishedCapacityRules.max_slots = validationRules.max_slots;
      }
      if (validationRules.max_slots_role_allotments !== undefined) {
        publishedCapacityRules.max_slots_role_allotments =
          validationRules.max_slots_role_allotments;
      }
      if (validationRules.unique_key_component !== undefined) {
        publishedCapacityRules.unique_key_component = validationRules.unique_key_component;
      }
      if (validationRules.visibility_rule !== undefined) {
        publishedCapacityRules.visibility_rule = validationRules.visibility_rule;
      }

      updatePayload = isPublished
        ? {
            id: field.id,
            event_id: eventId,
            label: values.label,
            applicability: values.applicability,
            placeholder,
            help_text: helpText,
            validation_rules: publishedCapacityRules,
          }
        : {
            id: field.id,
            event_id: eventId,
            label: values.label,
            applicability: values.applicability,
            is_required: values.is_required,
            is_active: values.is_active,
            placeholder,
            help_text: helpText,
            options: normalizedOptions,
            validation_rules: validationRules,
          };
    }

    try {
      if (updatePayload) {
        await updateMutation.mutateAsync(updatePayload);
        toast.success('Field updated.');
      } else {
        await createMutation.mutateAsync({
          event_id: eventId,
          field_key: values.field_key,
          label: values.label,
          field_type: values.field_type,
          applicability: values.applicability,
          is_required: values.is_required,
          is_active: values.is_active,
          placeholder,
          help_text: helpText,
          options: normalizedOptions,
          validation_rules: validationRules,
          display_order: 0,
        });
        toast.success('Field added.');
      }
      onClose();
    } catch (error) {
      let message = 'Something went wrong. Please try again or contact support.';
      if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    }
  }

  const canSave = isDirty && isValid && !isFullyLocked && !isPending;
  const disabledHint = (() => {
    if (isPending) return 'Save in progress.';
    if (errors.field_key?.message) return `Field Name: ${errors.field_key.message}`;
    if (errors.label?.message) return `Field Label: ${errors.label.message}`;
    if (errors.field_type?.message) return `Field Type: ${errors.field_type.message}`;
    if (!isDirty) return 'Make at least one change to enable saving.';
    if (!isValid) return 'Fix the validation errors above.';
    return null;
  })();

  return (
    <Dialog isOpen onClose={onClose} size="2xl">
      <Dialog.Header showCloseButton>
        <Dialog.Title>{isEditing ? 'Edit Field' : 'Add New Field'}</Dialog.Title>
      </Dialog.Header>
      <StatusBanners eventStatus={eventStatus} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog.Body scrollable className="space-y-5">
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
            applicabilityRegistration={register('applicability')}
            applicabilityValue={selectedApplicability}
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
              isOptionStructureLocked={isOptionStructureLocked}
              isCapacityLocked={isCapacityLocked}
              optionFields={optionFields}
              register={register}
              control={control}
              setValue={setValue}
              errors={errors}
              append={append}
              remove={remove}
              selectedFieldType={selectedFieldType}
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
              uniqueKeyComponentError={errors.val_unique_key_component?.message}
            />
          )}

          <VisibilityRuleSection
            isLocked={isFullyLocked}
            availableParentFields={availableParentFields}
            dependsOnFieldKey={dependsOnFieldKey}
            register={register}
          />
        </Dialog.Body>

        <Dialog.Footer className="flex-col items-stretch sm:flex-row sm:items-center sm:justify-end">
          <PanelFooter
            isFullyLocked={isFullyLocked}
            isEditing={isEditing}
            canSave={canSave}
            isPending={isPending}
            disabledHint={disabledHint}
            onClose={onClose}
          />
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}
