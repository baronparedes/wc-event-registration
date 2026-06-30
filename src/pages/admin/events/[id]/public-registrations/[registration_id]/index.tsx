import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SectionCard } from '@/components/ui/SectionCard'
import { UI_MESSAGES, toAdminEventPublicRegistrations } from '@/config/constants'
import {
  useCancelPublicRegistrationMutation,
  usePublicRegistrationDetailQuery,
  useReactivatePublicRegistrationMutation,
} from '@/hooks/domain/public-registrations'
import { useErrorWithFadeout } from '@/hooks/utils'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAnswer(answer: unknown, fieldType: string): string {
  if (answer === null || answer === undefined) {
    return '—'
  }

  if (fieldType === 'multi_select_toggle') {
    if (typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
      const entries = Object.entries(answer as Record<string, unknown>)
      return entries
        .map(
          ([key, value]) =>
            `${key}: ${value === true ? 'Yes' : value === false ? 'No' : String(value)}`,
        )
        .join(', ')
    }
    return String(answer)
  }

  if (fieldType === 'boolean') {
    return answer === true ? 'Yes' : answer === false ? 'No' : String(answer)
  }

  if (fieldType === 'multi_select' || fieldType === 'checkbox') {
    if (Array.isArray(answer)) {
      return answer.join(', ')
    }
  }

  return String(answer)
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'submitted':
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
          {UI_MESSAGES.registrationStatus.submitted}
        </span>
      )
    case 'updated':
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          {UI_MESSAGES.registrationStatus.updated}
        </span>
      )
    case 'cancelled':
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
          {UI_MESSAGES.registrationStatus.cancelled}
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700">
          {status}
        </span>
      )
  }
}

export function AdminPublicRegistrationDetailPage() {
  const { id: eventId, registration_id: registrationId } = useParams<{
    id: string
    registration_id: string
  }>()
  const navigate = useNavigate()
  const { showError } = useErrorWithFadeout()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)

  const detailQuery = usePublicRegistrationDetailQuery(registrationId ?? '')
  const cancelMutation = useCancelPublicRegistrationMutation(eventId ?? '')
  const reactivateMutation = useReactivatePublicRegistrationMutation(eventId ?? '')

  if (!eventId || !registrationId) {
    return <div>Invalid public registration ID</div>
  }

  if (detailQuery.error) {
    return (
      <section className="space-y-4">
        <Button
          variant="outline"
          onClick={() => navigate(toAdminEventPublicRegistrations(eventId))}
        >
          ← Back to Public Registrations
        </Button>
        <SectionCard title="Error">
          <p className="text-sm text-red-600">
            Error loading public registration:{' '}
            {detailQuery.error instanceof Error ? detailQuery.error.message : 'Unknown error'}
          </p>
        </SectionCard>
      </section>
    )
  }

  if (detailQuery.isLoading) {
    return (
      <section className="space-y-4">
        <Button
          variant="outline"
          onClick={() => navigate(toAdminEventPublicRegistrations(eventId))}
        >
          ← Back to Public Registrations
        </Button>
        <SectionCard title="Loading">
          <p className="text-sm text-muted">{UI_MESSAGES.loading.registrationDetails}</p>
        </SectionCard>
      </section>
    )
  }

  const data = detailQuery.data
  if (!data) {
    return (
      <section className="space-y-4">
        <Button
          variant="outline"
          onClick={() => navigate(toAdminEventPublicRegistrations(eventId))}
        >
          ← Back to Public Registrations
        </Button>
        <SectionCard title="Not Found">
          <p className="text-sm text-muted">Public registration not found.</p>
        </SectionCard>
      </section>
    )
  }

  const { registration, fieldResponses } = data
  const canCancel = registration.status !== 'cancelled'

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ registration_id: registrationId })
      setShowCancelDialog(false)
      navigate(toAdminEventPublicRegistrations(eventId))
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to cancel public registration')
    }
  }

  const handleReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync({ registration_id: registrationId })
      setShowReactivateDialog(false)
      navigate(toAdminEventPublicRegistrations(eventId))
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to reactivate public registration')
    }
  }

  return (
    <>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(toAdminEventPublicRegistrations(eventId))}
          >
            ← Back to Public Registrations
          </Button>
          {canCancel ? (
            <button
              onClick={() => setShowCancelDialog(true)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Cancel Registration
            </button>
          ) : (
            <button
              onClick={() => setShowReactivateDialog(true)}
              className="text-sm font-medium text-green-700 hover:text-green-800"
            >
              Reactivate Registration
            </button>
          )}
        </div>

        <SectionCard title="Attendee Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted">Full Name</p>
              <p className="mt-1 text-base text-text">
                {registration.first_name} {registration.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted">Email</p>
              <p className="mt-1 text-base text-text">{registration.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted">Phone</p>
              <p className="mt-1 text-base text-text">{registration.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted">Nickname</p>
              <p className="mt-1 text-base text-text">{registration.nickname ?? '—'}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Registration Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted">Status</p>
              <p className="mt-1">{getStatusBadge(registration.status)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted">Submitted</p>
              <p className="mt-1 text-base text-text">{formatDate(registration.submitted_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted">Last Updated</p>
              <p className="mt-1 text-base text-text">{formatDate(registration.updated_at)}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Responses">
          {fieldResponses.length === 0 ? (
            <p className="text-sm text-muted">No field responses recorded for this registration.</p>
          ) : (
            <div className="space-y-3">
              {fieldResponses.map((response) => (
                <div
                  key={response.field_id}
                  className="border-b border-gray-100 pb-3 last:border-0"
                >
                  <p className="text-sm font-medium text-muted">{response.field_label}</p>
                  <p className="mt-1 text-base text-text">
                    {formatAnswer(response.answer, response.field_type)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      <ConfirmDialog
        isOpen={showCancelDialog}
        onCancel={() => setShowCancelDialog(false)}
        title="Cancel Public Registration"
        description={
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to cancel this public registration? This action cannot be
              undone.
            </p>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-900">
                {registration.first_name} {registration.last_name}
              </p>
              <p className="text-sm text-gray-600">{registration.email}</p>
            </div>
          </div>
        }
        confirmLabel="Cancel Registration"
        confirmLoadingLabel="Cancelling..."
        confirmVariant="destructive"
        onConfirm={handleCancel}
        isPending={cancelMutation.isPending}
      />

      <ConfirmDialog
        isOpen={showReactivateDialog}
        onCancel={() => setShowReactivateDialog(false)}
        title="Reactivate Public Registration"
        description={
          <div className="space-y-4">
            <p className="text-gray-700">Restore this public registration to active status?</p>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-900">
                {registration.first_name} {registration.last_name}
              </p>
              <p className="text-sm text-gray-600">{registration.email}</p>
            </div>
          </div>
        }
        confirmLabel="Reactivate Registration"
        confirmLoadingLabel="Reactivating..."
        onConfirm={handleReactivate}
        isPending={reactivateMutation.isPending}
      />
    </>
  )
}
