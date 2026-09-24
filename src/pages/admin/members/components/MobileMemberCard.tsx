import { Edit, User } from 'lucide-react';

import {
  MobileCard,
  MobileCardActionLink,
  MobileCardActions,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardDivider,
} from '@/components/ui';
import { toRoute } from '@/config/constants';
import type { AdminMember } from '@/lib/domain/members';

import { MobileMemberHeader } from './MobileMemberHeader';
import { UpdateMemberIdDialog } from './UpdateMemberIdDialog';

type MobileMemberCardProps = {
  member: AdminMember;
  canWrite: boolean;
};

export function MobileMemberCard({ member, canWrite }: MobileMemberCardProps) {
  const canEdit = canWrite && member.is_active;
  let actionLabel = 'View';

  if (canEdit) {
    actionLabel = 'Edit';
  }

  return (
    <MobileCard>
      <MobileCardBody>
        <MobileMemberHeader member={member} />

        <MobileCardDivider />

        <MobileCardContent>
          <MobileCardContentItem label="Email" value={member.email} colSpan={2} isBreakAll />
          <MobileCardContentItem label="Contact Number" value={member.phone} />
          <MobileCardContentItem label="Member ID" value={member.member_id} isMono />
        </MobileCardContent>
      </MobileCardBody>

      <MobileCardActions>
        <MobileCardActionLink
          to={toRoute('adminMemberDetail', { id: member.id })}
          title={actionLabel}
          aria-label={actionLabel}
        >
          {canEdit ? <Edit className="h-4 w-4" /> : <User className="h-4 w-4" />}
          {actionLabel} Profile
        </MobileCardActionLink>
        {canEdit && (
          <UpdateMemberIdDialog
            memberId={member.id}
            memberName={member.full_name}
            currentMemberId={member.member_id}
            triggerClassName="flex min-h-12 w-[100px] flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
          />
        )}
      </MobileCardActions>
    </MobileCard>
  );
}
