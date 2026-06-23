import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  useAdminEventQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
} from '../../../hooks/admin'
import { createEventSchema } from '../../../lib/admin/eventSchema'
import type { CreateEventInput } from '../../../lib/admin/eventSchema'
import {
  EventDateRangeSection,
  EventDetailsSection,
  EventFormActions,
  EventRegistrationSettingsSection,
} from './components'

type AdminEventFormPageProps = {
  mode: 'create' | 'edit'
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
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

  const slugManuallyEdited = useRef(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: DEFAULT_VALUES,
  })

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

  // Auto-generate slug from title in create mode
  const titleValue = watch('title')
  useEffect(() => {
    if (!isEditMode && !slugManuallyEdited.current) {
      setValue('slug', generateSlug(titleValue), { shouldValidate: false })
    }
  }, [isEditMode, titleValue, setValue])

  async function onSubmit(data: CreateEventInput) {
    try {
      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, ...data })
        toast.success('Event updated successfully.')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Event created successfully.')
      }
      navigate('/admin/events')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save event.'
      toast.error(message)
    }
  }

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
  const slugValue = watch('slug')

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-text">{title}</h1>
        <p className="mt-1 text-sm text-muted">
          {isEditMode ? 'Update event details below.' : 'Fill in the details for your new event.'}
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <EventDetailsSection
          errors={errors}
          isEditMode={isEditMode}
          onSlugChange={(value) => {
            slugManuallyEdited.current = true
            setValue('slug', value, { shouldValidate: true })
          }}
          register={register}
          slugValue={slugValue}
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
        />

        <EventRegistrationSettingsSection register={register} />

        <EventFormActions
          isEditMode={isEditMode}
          isPending={isPending}
          onCancel={() => navigate('/admin/events')}
        />
      </form>
    </section>
  )
}
