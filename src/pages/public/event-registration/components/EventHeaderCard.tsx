import type { EventAvailability } from '../../../../lib/publicRegistration'
import { SectionCard } from '../../../../components/ui/SectionCard'

type EventHeaderCardProps = {
  slug?: string
  isLoading: boolean
  isError: boolean
  availability?: EventAvailability
  isGateReady: boolean
  eventWindowText: { opens: string; closes: string } | null
}

export function EventHeaderCard(props: EventHeaderCardProps) {
  const { slug, isLoading, isError, availability, isGateReady, eventWindowText } = props

  return (
    <SectionCard
      title="Event Registration"
      subtitle={
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
          Step 1 Required
        </span>
      }
      wrapperClassName="rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      {slug ? (
        <p className="mt-2 text-sm text-muted">
          Event slug: <span className="font-mono text-text">{slug}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-danger">Missing event slug.</p>
      )}

      {isLoading ? <p className="mt-4 text-sm text-muted">Loading event details...</p> : null}

      {isError ? (
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
    </SectionCard>
  )
}
