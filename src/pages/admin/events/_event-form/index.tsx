import { useEffect, useState } from 'react';

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
import { createEventSchema } from '@/lib/domain/events';
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
  allow_name_lookup: false,
  allow_public_registrations: false,
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // Extract slug generation logic (after useForm to ensure watch/setValue are available)
  const { slugValue, onSlugChange } = useSlugGeneration(isEditMode, watch, setValue);

  // Prefill form when editing an existing event
  useEffect(() => {
    if (isEditMode && existingEvent) {
      const eventMetadata = (existingEvent.metadata ?? {}) as Record<string, unknown>;
      reset({
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
        allow_name_lookup: eventMetadata.allow_name_lookup === true,
        allow_public_registrations: existingEvent.allow_public_registrations ?? false,
      });
    }
  }, [isEditMode, existingEvent, reset]);

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
    try {
      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, ...data });
        toast.success(TOAST_MESSAGES.eventSaved.updated);
      } else {
        await createMutation.mutateAsync(data);
        toast.success(TOAST_MESSAGES.eventSaved.created);
      }
      navigate(ROUTE_PATHS.adminEvents);
    } catch (error) {
      const message = error instanceof Error ? error.message : TOAST_MESSAGES.eventSaved.saveFailed;
      toast.error(message);
    } finally {
      cancelSave();
    }
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

  const formValues = useWatch({ control }) as CreateEventInput;

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
                size="sm"
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
            size="sm"
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
            slugValue={slugValue}
            disabled={isArchivedEvent}
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

          <EventRegistrationSettingsSection register={register} disabled={isArchivedEvent} />

          {formValues.status === 'draft' && <PublishRequirementsChecker formValues={formValues} />}

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
