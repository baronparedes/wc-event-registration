import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDeleteFormFieldMutation, useSaveFormFieldMutation } from '@/hooks/domain/forms';
import {
  fieldTypeHasDateValidation,
  fieldTypeHasMultiSelectValidation,
  fieldTypeHasNumberValidation,
  fieldTypeHasOptions,
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
import { FormFieldPanelHeader } from './FormFieldPanelHeader';
import { FormFieldTypeSection } from './FormFieldTypeSection';
import { FormFieldValidationSection } from './FormFieldValidationSection';

type FormFieldEditPanelProps = {
  formId: string;
  formStatus: FormStatus;
  field: FormField | null;
  onClose: () => void;
};

function fieldToFormValues(field: FormField): FormFieldFormValues {
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
  };
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formFieldFormSchema) as any,
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
  }

  async function onSubmit(values: FormFieldFormValues) {
    try {
      const normalizedOptions = showOptions
        ? values.options.map((o) => ({ label: o.label, value: o.value }))
        : [];

      await saveFieldMutation.mutateAsync({
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
          validation_rules: {},
          field_applicability: values.field_applicability,
          display_order: field?.display_order ?? 0,
        },
      });
      toast.success(isEditing ? 'Field updated.' : 'Field added.');
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again or contact support.';
      toast.error(message);
    }
  }

  async function handleDelete() {
    if (!field) return;
    try {
      await deleteFieldMutation.mutateAsync(field.id);
      toast.success(`"${field.label}" removed.`);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove field. Please try again.';
      toast.error(message);
    } finally {
      setIsDeleteConfirmOpen(false);
    }
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
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
        onClick={onClose}
      >
        <div
          className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <FormFieldPanelHeader isEditing={isEditing} onClose={onClose} />

          {!isDraft && (
            <div className="border-b border-blue-200 bg-blue-50 px-6 py-3">
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
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
                showMultiSelectValidation={showMultiSelectValidation}
                showDateValidation={showDateValidation}
              />
            )}

            <div className="flex items-center justify-between">
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
            </div>
          </form>
        </div>
      </div>

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
