/**
 * Shared publish requirements metadata for events.
 * Used in both form feedback and dialog confirmation.
 */

export type PublishRequirement = {
  key: string
  label: string
  filled: boolean
}

export function getPublishRequirements(data: {
  description?: string | null
  location?: string | null
  starts_at?: string | null
  ends_at?: string | null
  registration_opens_at?: string | null
  registration_closes_at?: string | null
}): PublishRequirement[] {
  return [
    { key: 'description', label: 'Description', filled: !!data.description?.trim() },
    { key: 'location', label: 'Location', filled: !!data.location?.trim() },
    { key: 'starts_at', label: 'Event Start Date & Time', filled: !!data.starts_at },
    { key: 'ends_at', label: 'Event End Date & Time', filled: !!data.ends_at },
    {
      key: 'registration_opens_at',
      label: 'Registration Opens',
      filled: !!data.registration_opens_at,
    },
    {
      key: 'registration_closes_at',
      label: 'Registration Closes',
      filled: !!data.registration_closes_at,
    },
  ]
}

export function areAllRequirementsMet(data: Parameters<typeof getPublishRequirements>[0]): boolean {
  return getPublishRequirements(data).every((req) => req.filled)
}
