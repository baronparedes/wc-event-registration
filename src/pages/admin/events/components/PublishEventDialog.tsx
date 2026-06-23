import { useState, useEffect } from 'react'
import { ActionButton } from '../../../../components/ui/ActionLink'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'
import {
  getPublishRequirements,
  areAllRequirementsMet,
} from '../../../../lib/admin/publishRequirements'
import type { AdminEvent } from '../../../../lib/admin/types'

type PublishEventModalProps = {
  eventData: AdminEvent | null
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

function PublishEventModal({ eventData, isPending, onConfirm, onClose }: PublishEventModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Open dialog when eventData is set, close when cleared
  useEffect(() => {
    setIsOpen(!!eventData)
  }, [eventData])

  if (!eventData) return null

  const requirements = getPublishRequirements(eventData)
  const allFilled = areAllRequirementsMet(eventData)
  const filledCount = requirements.filter((req) => req.filled).length

  const handleCancel = () => {
    setIsOpen(false)
    onClose()
  }

  const handleConfirm = () => {
    onConfirm()
    setIsOpen(false)
    onClose()
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Publish Event"
      description={
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <h4 className="mb-2 font-semibold text-sm text-blue-900">
              Requirements ({filledCount}/{requirements.length})
            </h4>
            <ul className="space-y-2">
              {requirements.map((req) => (
                <li key={req.key} className="flex items-center gap-2 text-sm">
                  {req.filled ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-red-500">✗</span>
                  )}
                  <span className={req.filled ? 'text-text' : 'text-red-600'}>{req.label}</span>
                </li>
              ))}
            </ul>
          </div>
          {!allFilled && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              ⚠️ Event is missing required fields. Please edit and complete before publishing.
            </div>
          )}
        </div>
      }
      confirmLabel="Publish Event"
      confirmLoadingLabel="Publishing..."
      confirmVariant={allFilled ? 'default' : 'outline'}
      isPending={isPending}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      disabled={!allFilled}
    />
  )
}

type PublishActionButtonProps = {
  event: AdminEvent
  isPending: boolean
  onPublish: (eventId: string, eventTitle: string) => void
}

/**
 * Publish button that opens a dialog showing requirements checklist.
 * Manages both button rendering and dialog state internally.
 */
export function PublishActionButton({ event, isPending, onPublish }: PublishActionButtonProps) {
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null)

  return (
    <>
      <ActionButton variant="default" onClick={() => setSelectedEvent(event)}>
        Publish
      </ActionButton>
      <PublishEventModal
        eventData={selectedEvent}
        isPending={isPending}
        onConfirm={() => onPublish(event.id, event.title)}
        onClose={() => setSelectedEvent(null)}
      />
    </>
  )
}
