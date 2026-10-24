import { Badge } from '@/components/ui/Badge';
import { ContactButtons } from '@/components/ui/ContactButtons';
import { extractDGroupValues } from '@/lib/domain/members';

interface DGroupDisplayProps {
  metadata?: Record<string, string>;
}

/** Displays read-only DGroup fields in a structured definition list. */
export function DGroupDisplay({ metadata }: DGroupDisplayProps) {
  const values = extractDGroupValues(metadata);

  const hasAnyData = Object.values(values).some(Boolean);

  if (!hasAnyData) {
    return <p className="text-sm text-muted">No discipleship group details recorded.</p>;
  }

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-base md:grid-cols-4">
      {values.status && (
        <div className="min-w-0">
          <dt className="text-muted text-sm">DGroup Status</dt>
          <dd className="mt-1">
            <Badge variant={values.status === 'leader' ? 'default' : 'secondary'}>
              {values.status === 'leader' ? 'Leader' : 'Member'}
            </Badge>
          </dd>
        </div>
      )}

      {values.memberSince && (
        <div className="min-w-0">
          <dt className="text-muted text-sm">Member Since</dt>
          <dd className="break-words font-medium text-text">{values.memberSince}</dd>
        </div>
      )}

      {values.leader && (
        <div className="min-w-0">
          <dt className="text-muted text-sm">DGroup Leader</dt>
          <dd className="break-words font-medium text-text">{values.leader}</dd>
        </div>
      )}

      {values.leaderContact && (
        <div className="min-w-0">
          <dt className="text-muted text-sm">Leader Contact</dt>
          <dd className="flex items-center gap-1.5 break-words font-medium text-text">
            <span>{values.leaderContact}</span>
            <ContactButtons phone={values.leaderContact} size="sm" variant="icon" />
          </dd>
        </div>
      )}

      {values.leaderEmail && (
        <div className="min-w-0">
          <dt className="text-muted text-sm">Leader Email</dt>
          <dd className="break-all font-medium text-text">
            <a href={`mailto:${values.leaderEmail}`} className="text-primary hover:underline">
              {values.leaderEmail}
            </a>
          </dd>
        </div>
      )}

      {values.minerOpenSchedule && (
        <div className="min-w-0">
          <dt className="text-muted text-sm">Miner Open Schedule</dt>
          <dd className="break-words font-medium text-text">{values.minerOpenSchedule}</dd>
        </div>
      )}

      {values.minerOpenSlots && (
        <div className="min-w-0">
          <dt className="text-muted text-sm">Miner Open Slots</dt>
          <dd className="break-words font-medium text-text">{values.minerOpenSlots}</dd>
        </div>
      )}
    </dl>
  );
}
