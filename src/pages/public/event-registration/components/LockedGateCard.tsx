import { SectionCard } from '../../../../components/ui/SectionCard'

export function LockedGateCard() {
  return (
    <SectionCard
      title="Registration Is Not Open Yet"
      wrapperClassName="rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-6"
    >
      <p className="text-sm text-muted">
        This event is not accepting registrations right now. Please check back later.
      </p>
    </SectionCard>
  )
}
