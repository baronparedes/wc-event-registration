import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import {
  buildDynamicFieldResponseSchema,
  createDynamicFieldDefaultValues,
  fetchPublicEventFields,
  fetchPublicEventBySlug,
  lookupMemberForRegistration,
  normalizeDynamicFieldAnswersForPreview,
  type DynamicFieldResponseValues,
  type MemberLookupProfile,
  type PublicEventField,
} from '../../../lib/publicRegistration'
import {
  DynamicFieldsStepCard,
  EventHeaderCard,
  LockedGateCard,
  MemberLookupStepCard,
  ProfileStepCard,
} from './components'

const memberLookupSchema = z.object({
  memberId: z.string().trim().min(1, 'Member ID is required').max(64, 'Member ID is too long'),
})

type MemberLookupFormValues = z.infer<typeof memberLookupSchema>

function formatUtcDateTime(value: string | null): string {
  if (!value) {
    return 'Not set'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Not set'
  }

  return parsed.toLocaleString()
}

export function EventRegistrationPage() {
  const { slug } = useParams<{ slug: string }>()
  const [matchedMember, setMatchedMember] = useState<MemberLookupProfile | null>(null)
  const [lookupErrorMessage, setLookupErrorMessage] = useState<string | null>(null)
  const [fieldConfigIssues, setFieldConfigIssues] = useState<string[]>([])
  const [answerPreview, setAnswerPreview] = useState<DynamicFieldResponseValues | null>(null)

  const eventQuery = useQuery({
    queryKey: ['public-event-by-slug', slug],
    queryFn: async () => {
      if (!slug) {
        throw new Error('Event slug is required')
      }

      return fetchPublicEventBySlug(slug)
    },
    enabled: Boolean(slug),
  })

  const lookupForm = useForm<MemberLookupFormValues>({
    resolver: zodResolver(memberLookupSchema),
    defaultValues: {
      memberId: '',
    },
  })

  const lookupMutation = useMutation({
    mutationFn: async (values: MemberLookupFormValues) =>
      lookupMemberForRegistration(values.memberId),
    onSuccess: (result) => {
      if (!result) {
        setMatchedMember(null)
        setLookupErrorMessage('We could not verify that ID. Check it and try again.')
        return
      }

      setMatchedMember(result)
      setLookupErrorMessage(null)
    },
    onError: () => {
      setMatchedMember(null)
      setLookupErrorMessage('Lookup is unavailable right now. Please try again in a moment.')
    },
  })

  const availability = eventQuery.data

  const dynamicForm = useForm<DynamicFieldResponseValues>({
    defaultValues: {},
  })

  const eventWindowText = useMemo(() => {
    if (!availability || availability.status !== 'available') {
      return null
    }

    return {
      opens: formatUtcDateTime(availability.event.registration_opens_at),
      closes: formatUtcDateTime(availability.event.registration_closes_at),
    }
  }, [availability])

  const isGateReady = availability?.status === 'available'
  const isDynamicFieldGateReady = isGateReady && Boolean(matchedMember)

  const eventFieldsQuery = useQuery({
    queryKey: [
      'public-event-fields',
      availability?.status === 'available' ? availability.event.id : null,
    ],
    queryFn: async () => {
      if (availability?.status !== 'available') {
        return { validFields: [] as PublicEventField[], issues: [] as string[] }
      }

      return fetchPublicEventFields(availability.event.id)
    },
    enabled: isDynamicFieldGateReady,
  })

  const activeFields = eventFieldsQuery.data?.validFields ?? []
  const responseSchema = useMemo(() => {
    return buildDynamicFieldResponseSchema(activeFields)
  }, [activeFields])

  useEffect(() => {
    dynamicForm.reset(createDynamicFieldDefaultValues(activeFields), {
      keepDefaultValues: false,
    })
    setAnswerPreview(null)
  }, [activeFields, dynamicForm])

  useEffect(() => {
    dynamicForm.clearErrors()
  }, [responseSchema, dynamicForm])

  useEffect(() => {
    setFieldConfigIssues(eventFieldsQuery.data?.issues ?? [])
  }, [eventFieldsQuery.data?.issues])

  useEffect(() => {
    if (!isDynamicFieldGateReady) {
      dynamicForm.reset({})
      setFieldConfigIssues([])
      setAnswerPreview(null)
    }
  }, [dynamicForm, isDynamicFieldGateReady])

  async function handleLookupSubmit(values: MemberLookupFormValues) {
    setLookupErrorMessage(null)
    setMatchedMember(null)
    setFieldConfigIssues([])
    setAnswerPreview(null)
    await lookupMutation.mutateAsync(values)
  }

  async function handlePreviewSubmit(values: DynamicFieldResponseValues) {
    setAnswerPreview(null)

    const parsed = responseSchema.safeParse(values)
    if (!parsed.success) {
      parsed.error.issues.forEach((issue: z.ZodIssue) => {
        const key = issue.path[0]
        if (typeof key === 'string') {
          dynamicForm.setError(key, {
            message: issue.message,
            type: 'manual',
          })
        }
      })
      return
    }

    const normalized = normalizeDynamicFieldAnswersForPreview(activeFields, parsed.data)
    setAnswerPreview({ answers: normalized })
    console.info('Dynamic answers preview (Chunk 4, no DB write):', normalized)
  }

  function fieldErrorMessage(fieldKey: string): string | undefined {
    const maybeError = dynamicForm.formState.errors[fieldKey]
    if (!maybeError) {
      return undefined
    }

    if (typeof maybeError.message === 'string') {
      return maybeError.message
    }

    return 'This field is invalid.'
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <EventHeaderCard
        slug={slug}
        isLoading={eventQuery.isLoading}
        isError={eventQuery.isError}
        availability={availability}
        isGateReady={isGateReady}
        eventWindowText={eventWindowText}
      />

      {isGateReady ? (
        <div className="space-y-6">
          <MemberLookupStepCard
            lookupForm={lookupForm}
            onLookupSubmit={handleLookupSubmit}
            isLookupPending={lookupMutation.isPending}
            lookupErrorMessage={lookupErrorMessage}
          />

          <ProfileStepCard matchedMember={matchedMember} />

          <DynamicFieldsStepCard
            matchedMember={matchedMember}
            isLoadingFields={eventFieldsQuery.isLoading}
            isFieldsError={eventFieldsQuery.isError}
            fieldConfigIssues={fieldConfigIssues}
            activeFields={activeFields}
            dynamicForm={dynamicForm}
            onPreviewSubmit={handlePreviewSubmit}
            fieldErrorMessage={fieldErrorMessage}
            answerPreview={answerPreview}
          />
        </div>
      ) : (
        <LockedGateCard />
      )}
    </section>
  )
}
