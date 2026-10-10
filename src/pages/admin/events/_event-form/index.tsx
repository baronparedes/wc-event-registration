import { useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ROUTE_PATHS, TOAST_MESSAGES, UI_MESSAGES } from '@/config/constants';
import {
  useAdminEventQuery,
  useArchiveEventMutation,
  useCreateEventMutation,
  usePublishEventMutation,
  useRestoreEventToDraftMutation,
  useUpdateEventMutation,
} from '@/hooks/domain/events';
import { useSaveConfirmation, useSlugGeneration } from '@/hooks/utils';
import { createEventSchema, derivePublicRegistrationAccess } from '@/lib/domain/events';
import type { CreateEventInput } from '@/lib/domain/events';

import { EventNavigationLinks, PublishActionButton } from '../components';
import {
  EventDateRangeSection,
  EventDetailsSection,
  EventFormActions,
  EventRegistrationSettingsSection,
  EventStatusWarning,
  PublishRequirementsChecker,
  SaveConfirmationDialog,
} from './components';

type AdminEventFormPageProps = {
  mode: 'create' | 'edit';
};

/** Converts an ISO timestamp to the datetime-local input format in Asia/Manila (UTC+8). */
function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  // sv-SE locale produces "YYYY-MM-DD HH:mm:ss" — slice and replace space to get datetime-local value
  return parsed.toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).slice(0, 16).replace(' ', 'T');
}

const DEFAULT_VALUES: CreateEventInput = {
  title: '',
  slug: '',
  description: '',
  location: '',
  starts_at: '',
  ends_at: '',
  registration_opens_at: '',
  registration_closes_at: '',
  status: 'draft',
  duplicate_policy: 'block',
  registration_mode: 'open',
  public_registration_access: 'members',
  allow_name_lookup: false,
  send_email_after_completion: false,
  cover_image_key: null,
};

export function AdminEventFormPage({ mode }: AdminEventFormPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = mode === 'edit';

  const { data: existingEvent, isLoading: isLoadingEvent } = useAdminEventQuery(
    isEditMode ? id : undefined,
  );
  const createMutation = useCreateEventMutation();
  const updateMutation = useUpdateEventMutation();
  const publishMutation = usePublishEventMutation();
  const archiveMutation = useArchiveEventMutation();
  const restoreToDraftMutation = useRestoreEventToDraftMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isRestoreToDraftConfirmOpen, setIsRestoreToDraftConfirmOpen] = useState(false);

  // Extract save confirmation logic
  const { showDialog, pendingFormData, requestConfirmation, confirmSave, cancelSave } =
    useSaveConfirmation();

  const formValues = useMemo(() => {
    if (isEditMode && existingEvent) {
      const eventMetadata = (existingEvent.metadata ?? {}) as Record<string, unknown>;
      return {
        title: existingEvent.title,
        slug: existingEvent.slug,
        description: existingEvent.description ?? '',
        location: existingEvent.location ?? '',
        starts_at: toDatetimeLocal(existingEvent.starts_at),
        ends_at: toDatetimeLocal(existingEvent.ends_at),
        registration_opens_at: toDatetimeLocal(existingEvent.registration_opens_at),
        registration_closes_at: toDatetimeLocal(existingEvent.registration_closes_at),
        status: existingEvent.status,
        duplicate_policy: existingEvent.duplicate_policy,
        registration_mode: existingEvent.registration_mode,
        public_registration_access: derivePublicRegistrationAccess({
          public_registration_access: eventMetadata.public_registration_access,
          allow_public_registrations: existingEvent.allow_public_registrations,
          require_id_lookup: existingEvent.require_id_lookup,
        }),
        allow_name_lookup: eventMetadata.allow_name_lookup === true,
        send_email_after_completion: eventMetadata.send_email_after_completion === true,
        cover_image_key: existingEvent.cover_image_key ?? null,
      };
    }
    return undefined;
  }, [isEditMode, existingEvent]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: DEFAULT_VALUES,
    values: formValues,
  });

  // Extract slug generation logic (after useForm to ensure watch/setValue are available)
  const { slugValue, onSlugChange } = useSlugGeneration(isEditMode, watch, setValue);

  async function onSubmit(data: CreateEventInput) {
    // If event is published and we're editing, show confirmation dialog
    if (isEditMode && existingEvent?.status === 'published') {
      requestConfirmation(data);
      return;
    }

    // Otherwise, save directly
    await performSave(data);
  }

  async function performSave(data: CreateEventInput) {
    const saveOperation =
      isEditMode && id
        ? () => updateMutation.mutateAsync({ id, ...data })
        : () => createMutation.mutateAsync(data);
    const successMessage =
      isEditMode && id ? TOAST_MESSAGES.eventSaved.updated : TOAST_MESSAGES.eventSaved.created;
    let saveFailed = false;
    let saveError: unknown;

    try {
      await saveOperation();
    } catch (error) {
      saveFailed = true;
      saveError = error;
    }

    if (saveFailed) {
      let message: string = TOAST_MESSAGES.eventSaved.saveFailed;
      if (saveError instanceof Error) {
        message = saveError.message;
      }
      toast.error(message);
    } else {
      toast.success(successMessage);
      navigate(ROUTE_PATHS.adminEvents);
    }
    cancelSave();
  }

  async function handlePublish(eventId: string, eventTitle: string) {
    try {
      await publishMutation.mutateAsync(eventId);
      toast.success(TOAST_MESSAGES.eventSaved.published(eventTitle));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : TOAST_MESSAGES.eventSaved.publishFailed;
      toast.error(message);
    }
  }

  async function handleArchive(eventId: string, eventTitle: string) {
    try {
      await archiveMutation.mutateAsync(eventId);
      toast.success(TOAST_MESSAGES.eventSaved.archived(eventTitle));
    } catch {
      toast.error(TOAST_MESSAGES.eventSaved.archiveFailed);
    }
  }

  async function handleRestoreToDraft(eventId: string, eventTitle: string) {
    try {
      await restoreToDraftMutation.mutateAsync(eventId);
      toast.success(`"${eventTitle}" has been moved to draft.`);
    } catch {
      toast.error('Failed to move event to draft. Please try again.');
    }
  }

  const watchedValues = useWatch({ control }) as CreateEventInput;
  const coverImageKey = useWatch({ control, name: 'cover_image_key' });

  if (isEditMode && isLoadingEvent) {
    return (
      <AdminPageShell>
        <AdminPageShell.Content isLoading={true} loadingMessage={UI_MESSAGES.loading.event}>
          {null}
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (isEditMode && !existingEvent && !isLoadingEvent) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Event Not Found" />
        <AdminPageShell.Content>
          <div className="text-sm text-red-600">{UI_MESSAGES.errors.eventNotFound}</div>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const title = isEditMode ? 'Manage Event' : 'Create Event';
  const isArchivedEvent = isEditMode && existingEvent?.status === 'archived';

  const breadcrumbs = isEditMode
    ? [
        { label: 'Events', to: ROUTE_PATHS.adminEvents },
        { label: existingEvent?.title ?? 'Event' },
        { label: 'Edit' },
      ]
    : undefined;

  const navLinks = isEditMode ? (
    <EventNavigationLinks eventId={id!} currentSection="event" />
  ) : undefined;

  const headerActions =
    isEditMode && existingEvent ? (
      <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center md:w-auto md:justify-end">
        {existingEvent.status !== 'published' && (
          <>
            {existingEvent.status === 'archived' ? (
              <Button
                type="button"
                variant="default"
                disabled={restoreToDraftMutation.isPending}
                onClick={() => setIsRestoreToDraftConfirmOpen(true)}
              >
                Move to Draft
              </Button>
            ) : (
              <PublishActionButton
                event={existingEvent}
                isPending={publishMutation.isPending}
                onPublish={handlePublish}
                triggerStyle="button"
              />
            )}
          </>
        )}
        {existingEvent.status !== 'archived' && (
          <Button
            type="button"
            variant="destructive"
            disabled={archiveMutation.isPending}
            onClick={() => setIsArchiveConfirmOpen(true)}
          >
            Archive
          </Button>
        )}

        {existingEvent.status !== 'archived' && (
          <ConfirmDialog
            isOpen={isArchiveConfirmOpen}
            title="Archive Event"
            description={
              <>
                Are you sure you want to archive{' '}
                <span className="font-medium text-text">"{existingEvent.title}"</span>? Archived
                events are no longer visible to the public. You can publish the event again to
                restore it.
              </>
            }
            confirmLabel="Archive"
            confirmLoadingLabel="Archiving..."
            confirmVariant="destructive"
            isPending={archiveMutation.isPending}
            onConfirm={async () => {
              await handleArchive(existingEvent.id, existingEvent.title);
              setIsArchiveConfirmOpen(false);
            }}
            onCancel={() => setIsArchiveConfirmOpen(false)}
          />
        )}

        {existingEvent.status === 'archived' && (
          <ConfirmDialog
            isOpen={isRestoreToDraftConfirmOpen}
            title="Move Event to Draft"
            description={
              <>
                Move <span className="font-medium text-text">"{existingEvent.title}"</span> back to
                draft? This will keep it hidden from the public until it is published again.
              </>
            }
            confirmLabel="Move to Draft"
            confirmLoadingLabel="Updating..."
            confirmVariant="default"
            isPending={restoreToDraftMutation.isPending}
            onConfirm={async () => {
              await handleRestoreToDraft(existingEvent.id, existingEvent.title);
              setIsRestoreToDraftConfirmOpen(false);
            }}
            onCancel={() => setIsRestoreToDraftConfirmOpen(false)}
          />
        )}
      </div>
    ) : undefined;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={breadcrumbs}
        navLinks={navLinks}
        title={title}
        description={
          isEditMode ? 'Update event details below.' : 'Fill in the details for your new event.'
        }
        actions={headerActions}
      />

      {existingEvent && <EventStatusWarning status={existingEvent.status} />}

      <AdminPageShell.Content>
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <EventDetailsSection
            errors={errors}
            isEditMode={isEditMode}
            onSlugChange={onSlugChange}
            register={register}
            control={control}
            slugValue={slugValue}
            disabled={isArchivedEvent}
            coverImageKey={coverImageKey}
            onCoverImageKeyChange={(key) =>
              setValue('cover_image_key', key, { shouldDirty: true, shouldValidate: true })
            }
            eventIdOrSlug={existingEvent?.slug || slugValue || undefined}
          />

          <EventDateRangeSection
            endId="event-ends-at"
            endLabel="Event End"
            endName="ends_at"
            errors={errors}
            register={register}
            startId="event-starts-at"
            startLabel="Event Start"
            startName="starts_at"
            title="Event Schedule"
            disabled={isArchivedEvent}
          />

          <EventDateRangeSection
            endId="event-reg-closes-at"
            endLabel="Registration Closes"
            endName="registration_closes_at"
            errors={errors}
            register={register}
            startId="event-reg-opens-at"
            startLabel="Registration Opens"
            startName="registration_opens_at"
            title="Registration Window"
            disabled={isArchivedEvent}
          />

          <EventRegistrationSettingsSection
            register={register}
            watch={watch}
            disabled={isArchivedEvent}
          />

          {watchedValues?.status === 'draft' && (
            <PublishRequirementsChecker formValues={watchedValues} />
          )}

          <EventFormActions
            isEditMode={isEditMode}
            isPending={isPending}
            onCancel={() => navigate(ROUTE_PATHS.adminEvents)}
            disabled={isArchivedEvent}
            hasChanges={!isEditMode || isDirty}
          />
        </form>

        {pendingFormData && existingEvent && (
          <SaveConfirmationDialog
            isOpen={showDialog}
            changedFieldNames={Object.keys(dirtyFields) as (keyof CreateEventInput)[]}
            isPending={isPending}
            onConfirm={() => {
              confirmSave();
              performSave(pendingFormData);
            }}
            onCancel={cancelSave}
          />
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
