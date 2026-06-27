import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ROUTE_PATHS } from '@/config/constants'
import {
  useAdminEventQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
} from '@/hooks/domain/events'
import { useSlugGeneration, useSaveConfirmation } from '@/hooks/utils'
import { createEventSchema } from '@/lib/domain/events'
import type { CreateEventInput } from '@/lib/domain/events'
import {
  EventDateRangeSection,
  EventDetailsSection,
  EventFormActions,
  EventRegistrationSettingsSection,
  EventStatusWarning,
  SaveConfirmationDialog,
  PublishRequirementsChecker,
} from './components'

type AdminEventFormPageProps = {
  mode: 'create' | 'edit'
}

/** Converts a UTC ISO timestamp to the datetime-local input format (YYYY-MM-DDTHH:mm). */
function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 16)
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
}

export function AdminEventFormPage({ mode }: AdminEventFormPageProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = mode === 'edit'

  const { data: existingEvent, isLoading: isLoadingEvent } = useAdminEventQuery(
    isEditMode ? id : undefined,
  )
  const createMutation = useCreateEventMutation()
  const updateMutation = useUpdateEventMutation()
  const isPending = createMutation.isPending || updateMutation.isPending

  // Extract save confirmation logic
  const { showDialog, pendingFormData, requestConfirmation, confirmSave, cancelSave } =
    useSaveConfirmation()

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
  })

  // Extract slug generation logic (after useForm to ensure watch/setValue are available)
  const { slugValue, onSlugChange } = useSlugGeneration(isEditMode, watch, setValue)

  // Prefill form when editing an existing event
  useEffect(() => {
    if (isEditMode && existingEvent) {
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
      })
    }
  }, [isEditMode, existingEvent, reset])

  async function onSubmit(data: CreateEventInput) {
    // If event is published and we're editing, show confirmation dialog
    if (isEditMode && existingEvent?.status === 'published') {
      requestConfirmation(data)
      return
    }

    // Otherwise, save directly
    await performSave(data)
  }

  async function performSave(data: CreateEventInput) {
    try {
      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, ...data })
        toast.success('Event updated successfully.')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Event created successfully.')
      }
      navigate(ROUTE_PATHS.adminEvents)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save event.'
      toast.error(message)
    } finally {
      cancelSave()
    }
  }

  const formValues = useWatch({ control }) as CreateEventInput

  if (isEditMode && isLoadingEvent) {
    return (
      <section className="mx-auto max-w-4xl">
        <p className="text-sm text-muted">Loading event...</p>
      </section>
    )
  }

  if (isEditMode && !existingEvent && !isLoadingEvent) {
    return (
      <section className="mx-auto max-w-4xl">
        <p className="text-sm text-red-600">Event not found.</p>
      </section>
    )
  }

  const title = isEditMode ? 'Edit Event' : 'Create Event'
  const isArchivedEvent = isEditMode && existingEvent?.status === 'archived'

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-text">{title}</h1>
        <p className="mt-1 text-sm text-muted">
          {isEditMode ? 'Update event details below.' : 'Fill in the details for your new event.'}
        </p>
      </div>

      {existingEvent && <EventStatusWarning status={existingEvent.status} />}

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
            confirmSave()
            performSave(pendingFormData)
          }}
          onCancel={cancelSave}
        />
      )}
    </section>
  )
}
