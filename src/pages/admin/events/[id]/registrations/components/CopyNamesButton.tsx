import { useMemo, useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Col } from '@/components/ui/Grid';
import { Grid } from '@/components/ui/Grid';
import { TOAST_MESSAGES, UI_MESSAGES } from '@/config/constants';
import { useRegistrationNamesQuery } from '@/hooks/domain/registrations';
import { useErrorWithFadeout } from '@/hooks/utils';
import {
  REGISTRATION_SHARE_FIELDS,
  REGISTRATION_SHARE_FIELD_LABELS,
  type RegistrationShareField,
  formatRegistrationShareText,
} from '@/lib/domain/registrations';

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
          <div className="space-y-3">
            <p>Select fields to include in the copied text.</p>

            <div className="space-y-3">
              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-sm font-semibold text-text">Core fields</p>
                <Grid base={1} md={3} gapClassName="gap-x-2 gap-y-3">
                  {REGISTRATION_SHARE_FIELDS.map((field) => (
                    <Col key={field}>
                      <label className="flex min-w-0 items-center gap-2 text-sm text-text">
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field)}
                          onChange={() => handleToggleField(field)}
                          className="!h-4 !w-4 min-h-0 shrink-0 self-start rounded border-border p-0 m-0 text-primary focus:ring-primary/40"
                        />
                        <span className="min-w-0 break-words leading-4">
                          {REGISTRATION_SHARE_FIELD_LABELS[field]}
                        </span>
                      </label>
                    </Col>
                  ))}
                </Grid>
              </div>

              {answerFieldOptions.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text">Dynamic fields</p>
                    <span className="text-xs text-muted">
                      {selectedAnswerFieldIds.length} selected
                    </span>
                  </div>

                  <input
                    type="search"
                    value={dynamicFieldSearch}
                    onChange={(event) => setDynamicFieldSearch(event.target.value)}
                    placeholder="Search dynamic fields"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
                  />

                  <div className="max-h-64 overflow-y-auto pr-1">
                    {filteredAnswerFieldOptions.length > 0 ? (
                      <Grid base={1} md={3} gapClassName="gap-x-2 gap-y-3">
                        {filteredAnswerFieldOptions.map((field) => (
                          <Col key={field.field_id}>
                            <label className="flex min-w-0 items-center gap-2 text-sm text-text">
                              <input
                                type="checkbox"
                                checked={selectedAnswerFieldIds.includes(field.field_id)}
                                onChange={() => handleToggleAnswerField(field.field_id)}
                                className="!h-4 !w-4 min-h-0 shrink-0 self-start rounded border-border p-0 m-0 text-primary focus:ring-primary/40"
                              />
                              <span className="min-w-0 break-words leading-4">{field.label}</span>
                            </label>
                          </Col>
                        ))}
                      </Grid>
                    ) : (
                      <p className="text-xs text-muted">No dynamic fields match your search.</p>
                    )}
                  </div>
                </div>
              ) : registrationNamesQuery.isFetching ? (
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted">Loading event answer fields...</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted">
                    No event answer fields are available for this event.
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-muted">
              All registrations for this event will be included, not just the current page.
            </p>
          </div>
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
