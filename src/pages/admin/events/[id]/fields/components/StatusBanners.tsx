import type { EventStatus } from '../../../../../../lib/admin/types'

type StatusBannersProps = {
  eventStatus: EventStatus
}

/** Display published or archived status warnings. */
export function StatusBanners({ eventStatus }: StatusBannersProps) {
  if (eventStatus === 'published') {
    return (
      <div className="mx-6 mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm font-medium text-blue-800">Published event</p>
        <p className="mt-1 text-xs text-blue-700">
          You can edit field labels and help text only. To change field types or validation rules,
          archive this event and create a new one.
        </p>
      </div>
    )
  }

  if (eventStatus === 'archived') {
    return (
      <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-medium text-amber-800">Archived event</p>
        <p className="mt-1 text-xs text-amber-700">Field edits are disabled on archived events.</p>
      </div>
    )
  }

  return null
}
