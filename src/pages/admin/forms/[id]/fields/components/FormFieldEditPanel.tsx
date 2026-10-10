import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { useDeleteFormFieldMutation, useSaveFormFieldMutation } from '@/hooks/domain/forms';
import {
  fieldTypeHasDateValidation,
  fieldTypeHasMultiSelectValidation,
  fieldTypeHasNumberValidation,
  fieldTypeHasOptions,
  fieldTypeHasRatingValidation,
  fieldTypeHasTextValidation,
  fieldTypeHasValidation,
} from '@/lib/domain/event-fields';
import type { EventFieldTypeEnum } from '@/lib/domain/event-fields';
import { DEFAULT_FORM_FIELD_VALUES, formFieldFormSchema } from '@/lib/domain/forms';
import type {
  FormField,
  FormFieldApplicability,
  FormFieldFormValues,
  FormStatus,
} from '@/lib/domain/forms';

import { FormFieldDetailsSection } from './FormFieldDetailsSection';
import { FormFieldDisplayTextSection } from './FormFieldDisplayTextSection';
import { FormFieldOptionsSection } from './FormFieldOptionsSection';
import { FormFieldPanelFooter } from './FormFieldPanelFooter';
import { FormFieldTypeSection } from './FormFieldTypeSection';
import { FormFieldValidationSection } from './FormFieldValidationSection';

type FormFieldEditPanelProps = {
  formId: string;
  formStatus: FormStatus;
  field: FormField | null;
  onClose: () => void;
};

function fieldToFormValues(field: FormField): FormFieldFormValues {
  const rules = (field.validation_rules as Record<string, unknown> | undefined) ?? {};
  return {
    field_key: field.field_key,
    label: field.label,
    field_type: field.field_type as FormFieldFormValues['field_type'],
    is_required: field.is_required,
    is_active: field.is_active,
    placeholder: field.placeholder ?? '',
    help_text: field.help_text ?? '',
    options: Array.isArray(field.options)
      ? field.options.map((o) => ({ label: o.label, value: o.value }))
      : [],
    field_applicability: field.field_applicability,
    val_min_length: rules.min_length != null ? String(rules.min_length) : '',
    val_max_length: rules.max_length != null ? String(rules.max_length) : '',
    val_pattern: typeof rules.pattern === 'string' ? rules.pattern : '',
    val_min: rules.min != null ? String(rules.min) : '',
    val_max: rules.max != null ? String(rules.max) : '',
    val_min_selections: rules.min_selections != null ? String(rules.min_selections) : '',
    val_max_selections: rules.max_selections != null ? String(rules.max_selections) : '',
    val_min_date: typeof rules.min_date === 'string' ? rules.min_date : '',
    val_max_date: typeof rules.max_date === 'string' ? rules.max_date : '',
  };
}

function toFormValidationRules(values: FormFieldFormValues): Record<string, unknown> {
  const rules: Record<string, unknown> = {};
  if (values.val_min_length) rules.min_length = parseInt(values.val_min_length, 10);
  if (values.val_max_length) rules.max_length = parseInt(values.val_max_length, 10);
  if (values.val_pattern) rules.pattern = values.val_pattern;
  if (values.field_type === 'rating') {
    if (values.val_max) {
      const parsedMax = parseInt(values.val_max, 10);
      if (Number.isFinite(parsedMax)) {
        rules.max = parsedMax;
      }
    }
  } else {
    if (values.val_min) rules.min = parseFloat(values.val_min);
    if (values.val_max) rules.max = parseFloat(values.val_max);
  }
  if (values.val_min_selections) rules.min_selections = parseInt(values.val_min_selections, 10);
  if (values.val_max_selections) rules.max_selections = parseInt(values.val_max_selections, 10);
  if (values.val_min_date) rules.min_date = values.val_min_date;
  if (values.val_max_date) rules.max_date = values.val_max_date;
  return rules;
}

/** Modal panel for creating or editing a form field. */
export function FormFieldEditPanel({
  formId,
  formStatus,
  field,
  onClose,
}: FormFieldEditPanelProps) {
  const isEditing = field !== null;
  const isDraft = formStatus === 'draft';

  const saveFieldMutation = useSaveFormFieldMutation(formId);
  const deleteFieldMutation = useDeleteFormFieldMutation(formId);
  const isPending = saveFieldMutation.isPending || deleteFieldMutation.isPending;

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty, isValid },
  } = useForm<FormFieldFormValues>({
    resolver: zodResolver(formFieldFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: field ? fieldToFormValues(field) : DEFAULT_FORM_FIELD_VALUES,
  });

  const { fields: optionFields, append, remove } = useFieldArray({ control, name: 'options' });

  const selectedFieldType = (useWatch({ control, name: 'field_type' }) ??
    'text') as EventFieldTypeEnum;
  const selectedApplicability =
    (useWatch({ control, name: 'field_applicability' }) as FormFieldApplicability | undefined) ??
    'all';

  // Form field types are a subset of event field types; safe to cast
  const showOptions = fieldTypeHasOptions(selectedFieldType as EventFieldTypeEnum);
  const showTextValidation = fieldTypeHasTextValidation(selectedFieldType as EventFieldTypeEnum);
  const showNumberValidation = fieldTypeHasNumberValidation(
    selectedFieldType as EventFieldTypeEnum,
  );
  const showRatingValidation = fieldTypeHasRatingValidation(
    selectedFieldType as EventFieldTypeEnum,
  );
  const showMultiSelectValidation = fieldTypeHasMultiSelectValidation(
    selectedFieldType as EventFieldTypeEnum,
  );
  const showDateValidation = fieldTypeHasDateValidation(selectedFieldType as EventFieldTypeEnum);
  const showValidationSection = fieldTypeHasValidation(selectedFieldType as EventFieldTypeEnum);

  function handleTypeSelect(type: EventFieldTypeEnum) {
    setValue('field_type', type as FormFieldFormValues['field_type'], {
      shouldDirty: true,
      shouldValidate: true,
    });
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
  }

  async function onSubmit(values: FormFieldFormValues) {
    const normalizedOptions = showOptions
      ? values.options.map((o) => ({ label: o.label, value: o.value }))
      : [];
    const payload = {
      id: field?.id,
      data: {
        field_key: values.field_key,
        label: values.label,
        field_type: values.field_type,
        is_required: values.is_required,
        is_active: values.is_active,
        placeholder: values.placeholder || null,
        help_text: values.help_text || null,
        options: normalizedOptions,
        validation_rules: toFormValidationRules(values),
        field_applicability: values.field_applicability,
        display_order: field?.display_order ?? 0,
      },
    };
    let saveFailed = false;
    let saveError: unknown;

    try {
      await saveFieldMutation.mutateAsync(payload);
    } catch (error) {
      saveFailed = true;
      saveError = error;
    }

    if (saveFailed) {
      let message = 'Something went wrong. Please try again or contact support.';
      if (saveError instanceof Error) message = saveError.message;
      toast.error(message);
      return;
    }

    const successMessage = isEditing ? 'Field updated.' : 'Field added.';
    toast.success(successMessage);
    onClose();
  }

  async function handleDelete() {
    if (!field) return;
    try {
      await deleteFieldMutation.mutateAsync(field.id);
      toast.success(`"${field.label}" removed.`);
      onClose();
    } catch (error) {
      let message = 'Failed to remove field. Please try again.';
      if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    }
    setIsDeleteConfirmOpen(false);
  }

  const canSave = isDirty && isValid && !isPending;

  const disabledHint = (() => {
    if (isPending) return 'Save in progress.';
    if (errors.field_key?.message) return `Field Key: ${errors.field_key.message}`;
    if (errors.label?.message) return `Field Label: ${errors.label.message}`;
    if (errors.field_type?.message) return `Field Type: ${errors.field_type.message}`;
    if (!isDirty) return 'Make at least one change to enable saving.';
    if (!isValid) return 'Fix the validation errors above.';
    return null;
  })();

  return (
    <>
      <Dialog isOpen onClose={onClose} size="2xl">
        <Dialog.Header showCloseButton>
          <Dialog.Title>{isEditing ? 'Edit Form Field' : 'Add Form Field'}</Dialog.Title>
        </Dialog.Header>

        {!isDraft && (
          <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
            <p className="text-sm font-medium text-blue-800">
              {formStatus === 'published' ? 'Published form' : 'Archived form'}
            </p>
            <p className="mt-0.5 text-xs text-blue-700">
              {formStatus === 'published'
                ? 'You can edit labels, audience, and display text on published forms.'
                : 'Field edits are disabled on archived forms.'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Body scrollable className="space-y-5">
            {/* Hidden input for field_type validation */}
            <input type="hidden" {...register('field_type')} />

            <FormFieldTypeSection
              isEditing={isEditing}
              selectedFieldType={selectedFieldType}
              onTypeSelect={handleTypeSelect}
              error={errors.field_type?.message}
            />

            <FormFieldDetailsSection
              isEditing={isEditing}
              field={field}
              fieldKeyRegistration={register('field_key')}
              labelRegistration={register('label')}
              applicabilityRegistration={register('field_applicability')}
              applicabilityValue={selectedApplicability}
              isRequiredRegistration={register('is_required')}
              isActiveRegistration={register('is_active')}
              errors={errors}
            />

            <FormFieldDisplayTextSection
              placeholderRegistration={register('placeholder')}
              helpTextRegistration={register('help_text')}
              errors={errors}
            />

            {showOptions && (
              <FormFieldOptionsSection
                optionFields={optionFields}
                register={register}
                errors={errors}
                append={append}
                remove={remove}
              />
            )}

            {showValidationSection && (
              <FormFieldValidationSection
                showTextValidation={showTextValidation}
                showNumberValidation={showNumberValidation}
                showRatingValidation={showRatingValidation}
                showMultiSelectValidation={showMultiSelectValidation}
                showDateValidation={showDateValidation}
                register={register}
              />
            )}
          </Dialog.Body>

          <Dialog.Footer className="justify-between">
            {isEditing && isDraft ? (
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={isPending}
                className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                Delete Field
              </button>
            ) : (
              <span />
            )}

            <FormFieldPanelFooter
              isEditing={isEditing}
              canSave={canSave && isDraft}
              isPending={isPending}
              disabledHint={!isDraft ? 'This form is not in draft mode.' : disabledHint}
              onClose={onClose}
            />
          </Dialog.Footer>
        </form>
      </Dialog>

      {isEditing && field && (
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="Delete Field"
          description={`Remove "${field.label}" from this form? This cannot be undone.`}
          confirmLabel="Delete Field"
          confirmLoadingLabel="Deleting..."
          confirmVariant="destructive"
          isPending={deleteFieldMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      )}
    </>
  );
}
