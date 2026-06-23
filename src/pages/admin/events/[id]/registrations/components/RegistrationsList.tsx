import { useState } from 'react'
import type { AdminRegistrationWithMember } from '../../../../../../lib/admin/registrationTypes'
import { ActionLink } from '../../../../../../components/ui/ActionLink'
import { CancelRegistrationDialog } from './CancelRegistrationDialog'

interface RegistrationsListProps {
  registrations: AdminRegistrationWithMember[]
  isLoading?: boolean
  eventId: string
  isEventArchived?: boolean
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'submitted':
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
          Submitted
        </span>
      )
    case 'updated':
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          Updated
        </span>
      )
    case 'cancelled':
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
          Cancelled
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

export function RegistrationsList({
  registrations,
  isLoading,
  eventId,
  isEventArchived,
}: RegistrationsListProps) {
  const [selectedRegistration, setSelectedRegistration] =
    useState<AdminRegistrationWithMember | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-gray-500">Loading registrations...</div>
      </div>
    )
  }

  if (registrations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-gray-500">
          <p className="text-base">No registrations yet</p>
        </div>
      </div>
    )
  }

  const handleCancelClick = (registration: AdminRegistrationWithMember) => {
    setSelectedRegistration(registration)
    setShowCancelDialog(true)
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Member ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Submitted</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((registration) => (
              <tr key={registration.id} className="border-b border-gray-100 hover:bg-background/50">
                <td className="px-4 py-3 text-sm text-gray-900">{registration.member_id}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{registration.full_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{registration.email}</td>
                <td className="px-4 py-3 text-sm">{getStatusBadge(registration.status)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatDate(registration.submitted_at)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <ActionLink to={`/admin/events/${eventId}/registrations/${registration.id}`}>
                      View
                    </ActionLink>
                    <button
                      onClick={() => handleCancelClick(registration)}
                      disabled={isEventArchived || registration.status === 'cancelled'}
                      className={`text-sm font-medium ${
                        isEventArchived || registration.status === 'cancelled'
                          ? 'cursor-not-allowed text-gray-400'
                          : 'text-red-600 hover:text-red-700'
                      }`}
                      title={
                        isEventArchived ? 'Cannot cancel registrations for archived events' : ''
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRegistration && (
        <CancelRegistrationDialog
          registration={selectedRegistration}
          isOpen={showCancelDialog}
          onClose={() => {
            setShowCancelDialog(false)
            setSelectedRegistration(null)
          }}
          eventId={eventId}
        />
      )}
    </>
  )
}
