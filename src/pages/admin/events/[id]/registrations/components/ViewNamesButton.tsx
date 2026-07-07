import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TOAST_MESSAGES } from '@/config/constants';
import { toAdminRegistrationNames } from '@/config/constants';
import { useRegistrationNamesQuery } from '@/hooks/domain/registrations';
import { useErrorWithFadeout } from '@/hooks/utils';
import { type RegistrationShareField } from '@/lib/domain/registrations';

import { RegistrationFieldSelector } from './RegistrationFieldSelector';

interface ViewNamesButtonProps {
  eventId: string;
  disabled?: boolean;
}

export function ViewNamesButton({ eventId, disabled = false }: ViewNamesButtonProps) {
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
    if (!fetched.data) throw new Error(TOAST_MESSAGES.registration.viewNamesFailed);

    return fetched.data;
  };

  const handleOpen = async () => {
    if (disabled) return;

    setIsDialogOpen(true);

    if (registrationNamesQuery.data || registrationNamesQuery.isFetching) return;

    try {
      await loadRegistrationNames();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : TOAST_MESSAGES.registration.viewNamesFailed,
      );
    }
  };

  const handleOpenInNewTab = () => {
    const url = toAdminRegistrationNames(eventId, {
      fields: selectedFields,
      answerFields: selectedAnswerFieldIds,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsDialogOpen(false);
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
        View Names
      </Button>

      <ConfirmDialog
        isOpen={isDialogOpen}
        title="View Registration Names"
        maxWidthClass="max-w-md sm:max-w-5xl"
        description={
          <RegistrationFieldSelector
            introText="Select fields to include in the printable view."
            footerText="All registrations for this event will be included, sorted by full name."
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
        confirmLabel="Open in New Tab"
        confirmLoadingLabel="Loading..."
        isPending={registrationNamesQuery.isFetching}
        onConfirm={handleOpenInNewTab}
        onCancel={() => setIsDialogOpen(false)}
      />
    </>
  );
}
