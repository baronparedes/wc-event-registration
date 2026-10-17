import { useRef } from 'react';

import { type UseFormReturn } from 'react-hook-form';

import { LoadingState, SectionCard } from '@/components/ui';
import { MemberLookupStepCard } from '@/pages/events/[slug]/register/components';

export type MemberLookupFormValues = { memberId?: string; name?: string };

export type ExcuseLookupStepCardProps = {
  isVerifyingSignedInMember: boolean;
  lookupForm: UseFormReturn<MemberLookupFormValues>;
  onLookupSubmit: (values: MemberLookupFormValues) => Promise<void>;
  isLookupPending: boolean;
  lookupErrorMessage: string | null;
  isRegistrationBlocked: boolean;
  memberIdHighlight?: boolean;
  memberIdInputRef?: React.RefObject<HTMLInputElement | null>;
  onDismissLookupError?: () => void;
  allowNameLookup?: boolean;
};

export function ExcuseLookupStepCard({
  isVerifyingSignedInMember,
  lookupForm,
  onLookupSubmit,
  isLookupPending,
  lookupErrorMessage,
  isRegistrationBlocked,
  memberIdHighlight,
  memberIdInputRef,
  onDismissLookupError,
  allowNameLookup = true,
}: ExcuseLookupStepCardProps) {
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const activeInputRef = memberIdInputRef ?? localInputRef;

  if (isVerifyingSignedInMember) {
    return (
      <SectionCard title="Verifying Profile">
        <LoadingState
          layout="horizontal"
          message="Checking your member profile..."
          className="py-4"
        />
      </SectionCard>
    );
  }

  return (
    <MemberLookupStepCard
      lookupForm={lookupForm}
      onLookupSubmit={onLookupSubmit}
      isLookupPending={isLookupPending}
      lookupErrorMessage={lookupErrorMessage}
      suppressLookupWarning={isRegistrationBlocked}
      memberIdInputRef={activeInputRef}
      shouldHighlightInput={Boolean(memberIdHighlight)}
      onDismissLookupError={onDismissLookupError}
      allowNameLookup={allowNameLookup}
      allowMemberRegistration={true}
      allowPublicRegistration={false}
    />
  );
}
