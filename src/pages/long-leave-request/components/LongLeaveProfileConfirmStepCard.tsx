import { Button } from '@/components/ui';
import { type MemberLookupProfile } from '@/lib/domain/members';
import { ProfileStepCard } from '@/pages/events/[slug]/register/components';

export type LongLeaveProfileConfirmStepCardProps = {
  matchedMember: MemberLookupProfile | null;
  isRegistrationBlocked: boolean;
  isSignedIn: boolean;
  onConfirm: () => void;
  onBackOrScanAnother: () => void;
};

export function LongLeaveProfileConfirmStepCard({
  matchedMember,
  isRegistrationBlocked,
  isSignedIn,
  onConfirm,
  onBackOrScanAnother,
}: LongLeaveProfileConfirmStepCardProps) {
  if (!matchedMember) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ProfileStepCard
        matchedMember={matchedMember}
        isRegistrationBlocked={isRegistrationBlocked}
        onContinueToStepThree={onConfirm}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          className="w-full"
          onClick={onBackOrScanAnother}
          size="lg"
          type="button"
          variant="accent"
        >
          {isSignedIn ? 'Back to Home' : 'Scan Another Member'}
        </Button>
      </div>
    </div>
  );
}
