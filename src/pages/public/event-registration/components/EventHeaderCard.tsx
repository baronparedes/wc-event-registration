import type { EventAvailability } from '../../../../lib/event-registration'
import { SectionCard } from '../../../../components/ui/SectionCard'

type EventHeaderCardProps = {
  slug?: string
  isLoading: boolean
  isError: boolean
  availability?: EventAvailability
  isGateReady: boolean
  eventWindowText: { opens: string; closes: string } | null
}

function formatDate(value: string | null): string {
  if (!value) return 'TBD'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'TBD'
  return parsed.toLocaleString()
}

export function EventHeaderCard(props: EventHeaderCardProps) {
  const { slug, isLoading, isError, availability, isGateReady, eventWindowText } = props

  const event =
    availability?.status === 'available' ||
    (availability?.status === 'unavailable' && availability.reason !== 'not_found_or_unpublished')
      ? (availability as Extract<EventAvailability, { event: unknown }>).event
      : null

  const title = event?.title ?? 'Register for This Event'

  return (
    <SectionCard
      title={title}
      subtitle={
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
          Event Registration
        </span>
      }
      wrapperClassName="rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      {event?.description ? (
        <p className="mt-3 text-sm text-muted leading-relaxed">{event.description}</p>
      ) : null}

      {event ? (
        <div className="mt-4 grid gap-2 rounded-lg border border-border bg-background/70 p-3 text-sm text-muted sm:grid-cols-2">
          {event.location ? (
            <p className="sm:col-span-2">
              Location: <span className="font-medium text-text">{event.location}</span>
            </p>
          ) : null}
          <p>
            Starts: <span className="font-medium text-text">{formatDate(event.starts_at)}</span>
          </p>
          <p>
            Ends: <span className="font-medium text-text">{formatDate(event.ends_at)}</span>
          </p>
          {availability?.status === 'available' ? (
            <p className="sm:col-span-2">
              Registered:{' '}
              <span className="font-medium text-text">{availability.registration_count}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {slug && !event ? (
        <p className="mt-2 text-sm text-muted">
          Event code: <span className="font-mono text-text">{slug}</span>
        </p>
      ) : null}

      {isLoading ? <p className="mt-4 text-sm text-muted">Loading event details...</p> : null}

      {isError ? (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          This event is unavailable right now.
        </p>
      ) : null}

      {availability?.status === 'unavailable' &&
      availability.reason === 'not_found_or_unpublished' ? (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          This event is unavailable right now.
        </p>
      ) : null}

      {availability?.status === 'unavailable' && availability.reason === 'not_open_yet' ? (
        <p className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-text">
          Registration opens soon.
        </p>
      ) : null}

      {availability?.status === 'unavailable' && availability.reason === 'registration_closed' ? (
        <p className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-text">
          Registration has already closed.
        </p>
      ) : null}

      {isGateReady && eventWindowText ? (
        <div className="mt-4 grid gap-2 rounded-lg border border-border bg-background/70 p-3 text-sm text-muted sm:grid-cols-2">
          <p>
            Registration opens:{' '}
            <span className="font-medium text-text">{eventWindowText.opens}</span>
          </p>
          <p>
            Registration closes:{' '}
            <span className="font-medium text-text">{eventWindowText.closes}</span>
          </p>
        </div>
      ) : null}
    </SectionCard>
  )
}
