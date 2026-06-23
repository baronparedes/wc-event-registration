import type { MemberLookupProfile } from '@/lib/event-registration'
import { SectionCard } from '@/components/ui/SectionCard'

type ProfileStepCardProps = {
  matchedMember: MemberLookupProfile | null
  shouldFadeDetails?: boolean
}

export function ProfileStepCard(props: ProfileStepCardProps) {
  const { matchedMember, shouldFadeDetails = false } = props

  return (
    <SectionCard title="Step 2: Confirm Your Details">
      {matchedMember ? (
        <div
          className={`space-y-2 text-sm text-muted transition-opacity duration-500 ${
            shouldFadeDetails ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <p>
            Name: <span className="font-medium text-text">{matchedMember.full_name}</span>
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
            You are verified. You can now complete your registration form.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">Your details will appear here after Step 1.</p>
      )}
    </SectionCard>
  )
}
