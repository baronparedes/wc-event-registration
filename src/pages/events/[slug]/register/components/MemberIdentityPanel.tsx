import type { MemberLookupProfile } from '@/lib/domain/members'

type MemberIdentityPanelProps = {
  matchedMember: MemberLookupProfile
}

type MemberDetailRowProps = {
  label: string
  value: string | null
}

function MemberDetailRow({ label, value }: MemberDetailRowProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2">
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted/80">{label}</dt>
      <dd className="mt-1 truncate text-base font-semibold leading-tight text-text">
        {value ? value : 'Not set'}
      </dd>
    </div>
  )
}

export function MemberIdentityPanel({ matchedMember }: MemberIdentityPanelProps) {
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <MemberDetailRow label="Name" value={matchedMember.full_name} />
      <MemberDetailRow label="Nickname" value={matchedMember.nickname} />
      <MemberDetailRow label="First name" value={matchedMember.first_name} />
      <MemberDetailRow label="Last name" value={matchedMember.last_name} />
    </dl>
  )
}
