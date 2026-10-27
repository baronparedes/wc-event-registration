import { useMemo, useState } from 'react';

import { ExternalLink, Search, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { toRoute } from '@/config/constants';
import type { MemberSundayCommitmentSlot } from '@/lib/domain/members';

interface SlotAttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: MemberSundayCommitmentSlot | null;
}

export function SlotAttendeesModal({ isOpen, onClose, slot }: SlotAttendeesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = useMemo(() => {
    if (!slot) return [];
    const query = searchTerm.trim().toLowerCase();
    if (!query) return slot.members;
    return slot.members.filter(
      (m) => m.fullName.toLowerCase().includes(query) || m.role.toLowerCase().includes(query),
    );
  }, [slot, searchTerm]);

  if (!slot) {
    return null;
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <Dialog.Header showCloseButton onClose={onClose}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <Dialog.Title>
            {slot.sundayLabel} — {slot.timeSlotLabel}
          </Dialog.Title>
        </div>
        <Dialog.Description>
          {slot.count} volunteer{slot.count === 1 ? '' : 's'} scheduled for this service time (
          {slot.percentage}% of committed volunteers)
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body scrollable className="max-h-[60vh]">
        <div className="flex flex-col gap-3">
          {slot.members.length > 5 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search volunteers by name or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-hidden"
              />
            </div>
          )}

          {filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              {searchTerm
                ? 'No volunteers found matching your search.'
                : 'No volunteers committed to this slot.'}
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-xl border border-border bg-surface">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 transition-colors hover:bg-background/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      avatarObjectKey={member.avatarObjectKey}
                      name={member.fullName}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{member.fullName}</p>
                      <div className="mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={toRoute('adminMemberDetail', { id: member.id })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-border/80 bg-background/50 px-2.5 py-1 text-xs font-medium text-text hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-xs"
                  >
                    <span>Profile</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Badge variant="outline" className="mr-auto text-xs">
          Total: {filteredMembers.length}
        </Badge>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
