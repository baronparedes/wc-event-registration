import { useState } from 'react';

import { AlertBanner } from '@/components/ui';
import { ActionButton } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  type AdminForm,
  areAllFormRequirementsMet,
  getFormPublishRequirements,
} from '@/lib/domain/forms';

export type PublishFormData = {
  title?: string | null;
  slug?: string | null;
  fieldsCount?: number | null;
};

type PublishFormModalProps = {
  formData: PublishFormData | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function PublishFormModal({
  formData,
  isPending,
  onConfirm,
  onClose,
}: PublishFormModalProps) {
  if (!formData) return null;

  const requirements = getFormPublishRequirements(formData);
  const allFilled = areAllFormRequirementsMet(formData);
  const filledCount = requirements.filter((req) => req.filled).length;

  const handleCancel = () => {
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <ConfirmDialog
      isOpen={Boolean(formData)}
      title="Publish Form"
      description={
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <h4 className="mb-2 font-semibold text-sm text-blue-900">
              Requirements ({filledCount}/{requirements.length})
            </h4>
            <ul className="space-y-2">
              {requirements.map((req) => (
                <li key={req.key} className="flex items-center gap-2 text-sm">
                  {req.filled ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-red-500">✗</span>
                  )}
                  <span className={req.filled ? 'text-text' : 'text-red-600'}>{req.label}</span>
                </li>
              ))}
            </ul>
          </div>
          {!allFilled && (
            <AlertBanner
              variant="warning"
              description="Form is missing required fields. Please complete all requirements before publishing."
            />
          )}
        </div>
      }
      confirmLabel="Publish Form"
      confirmLoadingLabel="Publishing..."
      confirmVariant={allFilled ? 'default' : 'outline'}
      isPending={isPending}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      disabled={!allFilled}
    />
  );
}

type PublishFormActionButtonProps = {
  form: AdminForm;
  fieldsCount?: number;
  isPending: boolean;
  onPublish: (formId: string, formTitle: string) => void;
  triggerStyle?: 'action' | 'button';
};

/**
 * Publish button that opens a dialog showing form requirements checklist.
 * Manages both button rendering and dialog state internally.
 */
export function PublishFormActionButton({
  form,
  fieldsCount = 0,
  isPending,
  onPublish,
  triggerStyle = 'action',
}: PublishFormActionButtonProps) {
  const [selectedFormData, setSelectedFormData] = useState<PublishFormData | null>(null);

  const formData: PublishFormData = {
    title: form.title,
    slug: form.slug,
    fieldsCount,
  };

  return (
    <>
      {triggerStyle === 'button' ? (
        <Button
          type="button"
          variant="default"
          disabled={isPending}
          onClick={() => setSelectedFormData(formData)}
        >
          Publish Form
        </Button>
      ) : (
        <ActionButton variant="default" onClick={() => setSelectedFormData(formData)}>
          Publish
        </ActionButton>
      )}
      <PublishFormModal
        formData={selectedFormData}
        isPending={isPending}
        onConfirm={() => onPublish(form.id, form.title)}
        onClose={() => setSelectedFormData(null)}
      />
    </>
  );
}
