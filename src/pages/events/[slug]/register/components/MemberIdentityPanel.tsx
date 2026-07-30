import { Avatar } from '@/components/ui/Avatar';
import type { MemberLookupProfile } from '@/lib/domain/members';

type MemberIdentityPanelProps = {
  matchedMember: MemberLookupProfile;
};

type MemberDetailRowProps = {
  label: string;
  value: string | null;
  className?: string;
};

function MemberDetailRow({ label, value, className }: MemberDetailRowProps) {
  return (
    <div
      className={`rounded-lg border border-border/70 bg-background/60 px-3 py-2 ${className ?? ''}`}
    >
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted/80">{label}</dt>
      <dd className="mt-1 truncate text-base font-semibold leading-tight text-text">
        {value ? value : 'Not set'}
      </dd>
    </div>
  );
}

export function MemberIdentityPanel({ matchedMember }: MemberIdentityPanelProps) {
  const firstName = matchedMember.first_name?.trim() || null;
  const lastInitial = matchedMember.last_initial?.trim() || null;
  const avatarName = [firstName, lastInitial].filter(Boolean).join(' ');

  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {avatarName && (
        <div className="sm:col-span-2 flex justify-center pb-1 pt-2">
          <Avatar name={avatarName} avatarObjectKey={matchedMember.avatar_object_key} size="2xl" />
        </div>
      )}
      <MemberDetailRow label="First name" value={firstName} />
      <MemberDetailRow label="Last initial" value={lastInitial} />
      <MemberDetailRow label="Role" value={matchedMember.role} className="sm:col-span-2" />
    </dl>
  );
}
