import { Mail, Phone, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Avatar, Badge, Button, Dialog } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import type { AdminMember } from '@/lib/domain/members';

export type MemberQuickViewDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  member: AdminMember | null;
};

export function MemberQuickViewDialog({ isOpen, onClose, member }: MemberQuickViewDialogProps) {
  const navigate = useNavigate();

  if (!member) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="sm">
      <Dialog.Header showCloseButton>
        <Dialog.Title>Member Details</Dialog.Title>
      </Dialog.Header>

      <Dialog.Body>
        <div className="flex flex-col items-center text-center">
          <Avatar
            size="2xl"
            name={member.full_name}
            avatarObjectKey={member.avatar_object_key}
            className="mb-4 shadow-sm border-2 border-surface"
          />
          <h3 className="font-heading text-xl font-bold text-text">{member.full_name}</h3>
          <p className="mt-1 text-sm font-medium text-muted">
            {member.member_id} • {member.nickname || 'No nickname'}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {member.role && (
              <Badge variant="secondary" className="px-2.5 py-1">
                <User className="mr-1.5 h-3.5 w-3.5" />
                {member.role}
              </Badge>
            )}
            {member.category && (
              <Badge variant="outline" className="px-2.5 py-1">
                {member.category}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-xl border border-border bg-surface-hover/30 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">Email</p>
              <p className="truncate text-sm text-text">
                {member.email ? (
                  <a href={`mailto:${member.email}`} className="hover:underline hover:text-primary">
                    {member.email}
                  </a>
                ) : (
                  <span className="italic text-muted/70">Not provided</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <Phone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">Phone</p>
              <p className="truncate text-sm text-text">
                {member.phone ? (
                  <a href={`tel:${member.phone}`} className="hover:underline hover:text-primary">
                    {member.phone}
                  </a>
                ) : (
                  <span className="italic text-muted/70">Not provided</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          Close
        </Button>
        <Button
          variant="default"
          onClick={() => {
            onClose();
            navigate(ROUTE_PATHS.adminMemberDetailPattern.replace(':id', member.id));
          }}
          className="w-full sm:w-auto"
        >
          View Full Profile
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
