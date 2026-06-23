type EventStatusWarningProps = {
  status: 'draft' | 'published' | 'archived'
}

/**
 * Warning banner displayed when editing published or archived events.
 * Published: warns about visibility to registrants
 * Archived: informs that event is immutable
 */
export function EventStatusWarning({ status }: EventStatusWarningProps) {
  if (status === 'draft') return null

  if (status === 'archived') {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm font-medium text-amber-900">
          ⚠️ This event is archived and cannot be edited. Publish it again to make changes.
        </p>
      </div>
    )
  }

  if (status === 'published') {
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm font-medium text-blue-900">
          ℹ️ This event is published. Changes will be visible to registrants.
        </p>
      </div>
    )
  }

  return null
}
