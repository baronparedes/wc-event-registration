import type { MemberLookupProfile } from '../../../../lib/event-registration'
import { SectionCard } from '../../../../components/ui/SectionCard'

type ProfileStepCardProps = {
  matchedMember: MemberLookupProfile | null
}

export function ProfileStepCard(props: ProfileStepCardProps) {
  const { matchedMember } = props

  return (
    <SectionCard title="Step 2: Confirm Profile">
      {matchedMember ? (
        <div className="space-y-2 text-sm text-muted">
          <p>
            Full name: <span className="font-medium text-text">{matchedMember.full_name}</span>
          </p>
          <p>
            Nickname:{' '}
            <span className="font-medium text-text">
              {matchedMember.nickname ? matchedMember.nickname : 'Not set'}
            </span>
          </p>
          <p>
            First name:{' '}
            <span className="font-medium text-text">
              {matchedMember.first_name ? matchedMember.first_name : 'Not set'}
            </span>
          </p>
          <p>
            Last name:{' '}
            <span className="font-medium text-text">
              {matchedMember.last_name ? matchedMember.last_name : 'Not set'}
            </span>
          </p>
          <p className="rounded-md border border-secondary/30 bg-secondary/10 px-3 py-2 text-secondary">
            ID verified. Dynamic registration fields are now unlocked for this event.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">Profile is locked until ID verification succeeds.</p>
      )}
    </SectionCard>
  )
}
