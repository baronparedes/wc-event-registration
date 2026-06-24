import { useMemo } from 'react'
import { getPublishRequirements } from '@/lib/domain/events'

type PublishRequirementsCheckerProps = {
  formValues: {
    description?: string | null
    location?: string | null
    starts_at?: string | null
    ends_at?: string | null
    registration_opens_at?: string | null
    registration_closes_at?: string | null
  }
}

export function PublishRequirementsChecker({ formValues }: PublishRequirementsCheckerProps) {
  const requirements = useMemo(() => getPublishRequirements(formValues), [formValues])

  const allFilled = requirements.every((req) => req.filled)
  const filledCount = requirements.filter((req) => req.filled).length

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h3 className="mb-3 font-semibold text-sm text-blue-900">
        Publish Requirements ({filledCount}/{requirements.length})
      </h3>
      <ul className="space-y-2">
        {requirements.map((req) => (
          <li key={req.key} className="flex items-center gap-2 text-sm">
            {req.filled ? (
              <span className="text-green-600">✓</span>
            ) : (
              <span className="text-gray-400">○</span>
            )}
            <span className={req.filled ? 'text-text' : 'text-muted'}>{req.label}</span>
          </li>
        ))}
      </ul>
      {allFilled && (
        <div className="mt-3 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
          ✓ Event is ready to publish
        </div>
      )}
    </div>
  )
}
