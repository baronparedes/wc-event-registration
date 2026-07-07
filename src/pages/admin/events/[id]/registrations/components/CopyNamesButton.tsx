import { useMemo, useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TOAST_MESSAGES, UI_MESSAGES } from '@/config/constants';
import { useRegistrationNamesQuery } from '@/hooks/domain/registrations';
import { useErrorWithFadeout } from '@/hooks/utils';
import {
  type RegistrationShareField,
  formatRegistrationShareText,
} from '@/lib/domain/registrations';

import { RegistrationFieldSelector } from './RegistrationFieldSelector';

interface CopyNamesButtonProps {
  eventId: string;
  eventTitle?: string;
  disabled?: boolean;
}

function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const didCopy = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!didCopy) {
    throw new Error('Clipboard is not available in this browser');
  }

  return Promise.resolve();
}

export function CopyNamesButton({ eventId, eventTitle, disabled = false }: CopyNamesButtonProps) {
  const registrationNamesQuery = useRegistrationNamesQuery(eventId, { enabled: false });
  const { showError } = useErrorWithFadeout();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<RegistrationShareField[]>(['full_name']);
  const [selectedAnswerFieldIds, setSelectedAnswerFieldIds] = useState<string[]>([]);
  const [dynamicFieldSearch, setDynamicFieldSearch] = useState('');

  const answerFieldOptions = useMemo(
    () => registrationNamesQuery.data?.answer_fields ?? [],
    [registrationNamesQuery.data?.answer_fields],
  );

  const filteredAnswerFieldOptions = useMemo(() => {
    const normalizedSearch = dynamicFieldSearch.trim().toLowerCase();
    if (!normalizedSearch) return answerFieldOptions;

    return answerFieldOptions.filter((field) =>
      field.label.toLowerCase().includes(normalizedSearch),
    );
  }, [answerFieldOptions, dynamicFieldSearch]);

  const handleToggleField = (field: RegistrationShareField) => {
    setSelectedFields((currentFields) => {
      if (currentFields.includes(field)) {
        if (currentFields.length === 1) return currentFields;
        return currentFields.filter((value) => value !== field);
      }

      return [...currentFields, field];
    });
  };

  const handleToggleAnswerField = (fieldId: string) => {
    setSelectedAnswerFieldIds((currentFieldIds) => {
      if (currentFieldIds.includes(fieldId)) {
        return currentFieldIds.filter((value) => value !== fieldId);
      }

      return [...currentFieldIds, fieldId];
    });
  };

  const loadRegistrationNames = async () => {
    const cached = registrationNamesQuery.data;
    if (cached) return cached;

    const fetched = await registrationNamesQuery.refetch();
    if (fetched.error) throw fetched.error;
    if (!fetched.data) throw new Error(TOAST_MESSAGES.registration.copyNamesFailed);

    return fetched.data;
  };

  const handleOpen = async () => {
    if (disabled) {
      return;
    }

    setIsDialogOpen(true);

    if (registrationNamesQuery.data || registrationNamesQuery.isFetching) {
      return;
    }

    try {
      await loadRegistrationNames();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : TOAST_MESSAGES.registration.copyNamesFailed,
      );
    }
  };

  const handleCopy = async () => {
    try {
      const payload = await loadRegistrationNames();

      if (payload.rows.length === 0) {
        throw new Error(UI_MESSAGES.empty.noRegistrationsYet);
      }

      const text = formatRegistrationShareText({
        rows: payload.rows,
        selectedFields,
        selectedAnswerFieldIds,
        answerFields: payload.answer_fields,
        eventTitle: payload.event_title || eventTitle,
      });

      await copyTextToClipboard(text);
      toast.success(TOAST_MESSAGES.registration.namesCopied(payload.row_count));
      setIsDialogOpen(false);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : TOAST_MESSAGES.registration.copyNamesFailed,
      );
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="primaryOutline"
        disabled={disabled}
        onClick={() => {
          void handleOpen();
        }}
      >
        Copy Names
      </Button>

      <ConfirmDialog
        isOpen={isDialogOpen}
        title="Copy Registration Names"
        maxWidthClass="max-w-md sm:max-w-5xl"
        description={
          <RegistrationFieldSelector
            introText="Select fields to include in the copied text."
            footerText="All registrations for this event will be included, not just the current page."
            selectedFields={selectedFields}
            selectedAnswerFieldIds={selectedAnswerFieldIds}
            dynamicFieldSearch={dynamicFieldSearch}
            answerFieldOptions={answerFieldOptions}
            filteredAnswerFieldOptions={filteredAnswerFieldOptions}
            isFetching={registrationNamesQuery.isFetching}
            onToggleField={handleToggleField}
            onToggleAnswerField={handleToggleAnswerField}
            onDynamicFieldSearchChange={setDynamicFieldSearch}
          />
        }
        confirmLabel="Copy to Clipboard"
        confirmLoadingLabel="Copying..."
        isPending={registrationNamesQuery.isFetching}
        onConfirm={() => {
          void handleCopy();
        }}
        onCancel={() => setIsDialogOpen(false)}
      />
    </>
  );
}
