import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import {
  fetchPublicEventBySlug,
  lookupMemberForRegistration,
  type MemberLookupProfile,
} from '../../lib/publicRegistration'

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

  async function handleLookupSubmit(values: MemberLookupFormValues) {
    setLookupErrorMessage(null)
    setMatchedMember(null)
    await lookupMutation.mutateAsync(values)
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
          Step 1 Required
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text">Event Registration</h1>

        {slug ? (
          <p className="mt-2 text-sm text-muted">
            Event slug: <span className="font-mono text-text">{slug}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-danger">Missing event slug.</p>
        )}

        {eventQuery.isLoading ? (
          <p className="mt-4 text-sm text-muted">Loading event details...</p>
        ) : null}

        {eventQuery.isError ? (
          <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            Event is not available.
          </p>
        ) : null}

        {availability?.status === 'unavailable' &&
        availability.reason === 'not_found_or_unpublished' ? (
          <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            Event is not available.
          </p>
        ) : null}

        {availability?.status === 'unavailable' && availability.reason === 'not_open_yet' ? (
          <p className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-text">
            Registration has not opened yet.
          </p>
        ) : null}

        {availability?.status === 'unavailable' && availability.reason === 'registration_closed' ? (
          <p className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-text">
            Registration is closed.
          </p>
        ) : null}

        {isGateReady && eventWindowText ? (
          <div className="mt-4 grid gap-2 rounded-lg border border-border bg-background/70 p-3 text-sm text-muted sm:grid-cols-2">
            <p>
              Opens: <span className="font-medium text-text">{eventWindowText.opens}</span>
            </p>
            <p>
              Closes: <span className="font-medium text-text">{eventWindowText.closes}</span>
            </p>
          </div>
        ) : null}
      </div>

      {isGateReady ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-heading text-xl font-semibold text-text">
              Step 1: Verify Member ID
            </h2>
            <p className="mt-2 text-sm text-muted">
              Enter your member ID to unlock the registration form.
            </p>

            <form
              className="mt-4 space-y-3"
              onSubmit={lookupForm.handleSubmit(handleLookupSubmit)}
              noValidate
            >
              <div className="space-y-1">
                <label className="text-sm font-medium text-text" htmlFor="member-id-input">
                  Member ID
                </label>
                <input
                  id="member-id-input"
                  type="text"
                  autoComplete="off"
                  placeholder="Enter your member ID"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary"
                  disabled={lookupMutation.isPending}
                  {...lookupForm.register('memberId')}
                />
                {lookupForm.formState.errors.memberId ? (
                  <p className="text-sm text-danger">
                    {lookupForm.formState.errors.memberId.message}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={lookupMutation.isPending}
              >
                {lookupMutation.isPending ? 'Verifying...' : 'Verify ID'}
              </button>
            </form>

            {lookupErrorMessage ? (
              <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {lookupErrorMessage}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-heading text-xl font-semibold text-text">
              Step 2: Confirm Profile
            </h2>

            {matchedMember ? (
              <div className="mt-3 space-y-2 text-sm text-muted">
                <p>
                  Full name:{' '}
                  <span className="font-medium text-text">{matchedMember.full_name}</span>
                </p>
                <p>
                  Nickname:{' '}
                  <span className="font-medium text-text">
                    {matchedMember.nickname ? matchedMember.nickname : 'Not set'}
                  </span>
                </p>
                <p>
                  First name:{' '}
                  <span className="font-medium text-text">
                    {matchedMember.first_name ? matchedMember.first_name : 'Not set'}
                  </span>
                </p>
                <p>
                  Last name:{' '}
                  <span className="font-medium text-text">
                    {matchedMember.last_name ? matchedMember.last_name : 'Not set'}
                  </span>
                </p>
                <p className="rounded-md border border-secondary/30 bg-secondary/10 px-3 py-2 text-secondary">
                  ID verified. Dynamic registration fields will be enabled in the next chunk.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Profile is locked until ID verification succeeds.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-6">
          <h2 className="font-heading text-xl font-semibold text-text">ID Lookup Gate</h2>
          <p className="mt-2 text-sm text-muted">
            The ID gate will unlock only when this event is available for registration.
          </p>
        </div>
      )}
    </section>
  )
}
