import { SectionCard } from '../../../../components/ui/SectionCard'

export function LockedGateCard() {
  return (
    <SectionCard
      title="ID Lookup Gate"
      wrapperClassName="rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-6"
    >
      <p className="text-sm text-muted">
        The ID gate will unlock only when this event is available for registration.
      </p>
    </SectionCard>
  )
}
