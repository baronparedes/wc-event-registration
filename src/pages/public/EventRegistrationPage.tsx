import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import {
  buildDynamicFieldResponseSchema,
  createDynamicFieldDefaultValues,
  normalizeDynamicFieldAnswersForPreview,
  type DynamicFieldResponseValues,
  type PublicEventField,
} from '../../lib/event-registration'
import {
  usePublicEventQuery,
  usePublicEventFieldsQuery,
  useMemberLookupMutation,
  type MemberLookupProfile,
} from '../../hooks/event-registration'
import {
  EventHeaderCard,
  LockedGateCard,
  MemberLookupStepCard,
  ProfileStepCard,
} from './event-registration/components'
import { DynamicFieldsStepCard } from './event-registration/components'

const memberLookupSchema = z.object({
  memberId: z.string().trim().min(1, 'Member ID is required').max(64, 'Member ID is too long'),
})

const EMPTY_PUBLIC_FIELDS: PublicEventField[] = []
const EMPTY_FIELD_ISSUES: string[] = []

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
  const memberIdInputRef = useRef<HTMLInputElement | null>(null)
  const [matchedMember, setMatchedMember] = useState<MemberLookupProfile | null>(null)
  const [lookupErrorMessage, setLookupErrorMessage] = useState<string | null>(null)
  const [fieldConfigIssues, setFieldConfigIssues] = useState<string[]>([])

  const eventQuery = usePublicEventQuery(slug)
  const availability = eventQuery.data

  const lookupForm = useForm<MemberLookupFormValues>({
    resolver: zodResolver(memberLookupSchema),
    defaultValues: {
      memberId: '',
    },
  })

  const lookupMutation = useMemberLookupMutation()

  const handleLookupSuccess = (result: MemberLookupProfile | null) => {
    if (!result) {
      setMatchedMember(null)
      setLookupErrorMessage('We could not verify that ID. Check it and try again.')
      return
    }

    setMatchedMember(result)
    setLookupErrorMessage(null)
  }

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

  const focusMemberIdInput = () => {
    requestAnimationFrame(() => {
      memberIdInputRef.current?.focus()
    })

    // Retry once after paint to handle late mount/layout timing.
    setTimeout(() => {
      memberIdInputRef.current?.focus()
    }, 120)
  }

  useEffect(() => {
    if (isGateReady) {
      focusMemberIdInput()
    }
  }, [isGateReady])

  const eventFieldsQuery = usePublicEventFieldsQuery(
    isDynamicFieldGateReady && isGateReady ? availability.event.id : undefined,
  )

  const activeFields = eventFieldsQuery.data?.validFields ?? EMPTY_PUBLIC_FIELDS
  const responseSchema = useMemo(() => {
    return buildDynamicFieldResponseSchema(activeFields)
  }, [activeFields])

  useEffect(() => {
    dynamicForm.reset(createDynamicFieldDefaultValues(activeFields), {
      keepDefaultValues: false,
    })
  }, [activeFields, dynamicForm])

  useEffect(() => {
    dynamicForm.clearErrors()
  }, [responseSchema, dynamicForm])

  useEffect(() => {
    setFieldConfigIssues(eventFieldsQuery.data?.issues ?? EMPTY_FIELD_ISSUES)
  }, [eventFieldsQuery.data?.issues])

  useEffect(() => {
    if (!isDynamicFieldGateReady) {
      dynamicForm.reset({})
      setFieldConfigIssues([])
    }
  }, [dynamicForm, isDynamicFieldGateReady])

  async function handleLookupSubmit(values: MemberLookupFormValues) {
    setLookupErrorMessage(null)
    setMatchedMember(null)
    setFieldConfigIssues([])
    try {
      const result = await lookupMutation.mutateAsync({
        memberId: values.memberId,
        eventSlug: slug,
      })
      handleLookupSuccess(result.profile)
    } catch {
      setMatchedMember(null)
      setLookupErrorMessage('Lookup is unavailable right now. Please try again in a moment.')
    }
  }

  async function handlePreviewSubmit(values: DynamicFieldResponseValues) {
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
            memberIdInputRef={memberIdInputRef}
          />

          <ProfileStepCard matchedMember={matchedMember} />

          <DynamicFieldsStepCard
            matchedMember={matchedMember}
            isLoadingFields={eventFieldsQuery.isLoading}
            isFieldsError={eventFieldsQuery.isError}
            fieldConfigIssues={fieldConfigIssues}
            activeFields={activeFields}
            dynamicForm={dynamicForm}
            onSubmit={handlePreviewSubmit}
            fieldErrorMessage={fieldErrorMessage}
            isSubmitPending={false}
            submitErrorMessage={null}
            submitSuccessMessage={null}
          />
        </div>
      ) : (
        <LockedGateCard />
      )}
    </section>
  )
}
