import { useMemo, useState } from 'react';

import { Download, ExternalLink, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { SearchInputField } from '@/components/ui/SearchInputField';
import { toRoute } from '@/config/constants';
import {
  type MemberInactivityAnalytics,
  buildInactiveVolunteersCsvExport,
} from '@/lib/domain/members';
import { formatDateOnly } from '@/lib/infrastructure';

interface InactiveVolunteersModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: MemberInactivityAnalytics;
}

export function InactiveVolunteersModal({
  isOpen,
  onClose,
  analytics,
}: InactiveVolunteersModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  const filteredMembers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return analytics.members;
    return analytics.members.filter(
      (member) =>
        member.fullName.toLowerCase().includes(query) || member.role.toLowerCase().includes(query),
    );
  }, [analytics.members, searchTerm]);

  const handleExportCsv = () => {
    if (filteredMembers.length === 0) return;

    const { csvText, filename } = buildInactiveVolunteersCsvExport(filteredMembers);
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(
      `Exported ${filteredMembers.length} inactive volunteer${filteredMembers.length === 1 ? '' : 's'} to CSV`,
    );
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="4xl">
      <Dialog.Header showCloseButton onClose={handleClose}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <UserX className="h-4 w-4" />
          </div>
          <Dialog.Title>
            Inactive Volunteers (&gt; {analytics.thresholdSundays} Sundays)
          </Dialog.Title>
        </div>
        <Dialog.Description>
          {analytics.inactiveCount} active volunteer{analytics.inactiveCount === 1 ? '' : 's'} with
          no service attendance for more than {analytics.thresholdSundays} Sundays (
          {analytics.percentage}% of active members)
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body>
        <div className="flex flex-col gap-3">
          {analytics.members.length > 0 && (
            <SearchInputField
              ariaLabel="Search inactive volunteers"
              placeholder="Search volunteers by name or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          )}

          {filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              {searchTerm
                ? 'No inactive volunteers found matching your search.'
                : `No volunteers have been inactive for more than ${analytics.thresholdSundays} Sundays.`}
            </div>
          ) : (
            <div className="max-h-[55vh] lg:max-h-[68vh] overflow-y-auto pr-1">
              <div className="divide-y divide-border/60 rounded-xl border border-border bg-surface">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-2.5 p-3.5 transition-colors hover:bg-background/60 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        avatarObjectKey={member.avatarObjectKey}
                        name={member.fullName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-text">
                            {member.fullName}
                          </p>
                          <Badge variant="primaryOutline">{member.role}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pl-11 sm:flex-nowrap sm:justify-end sm:gap-3 sm:pl-0 shrink-0">
                      <span className="text-xs text-muted">
                        {member.lastActivity
                          ? `Last attended: ${formatDateOnly(member.lastActivity)}`
                          : `Joined > ${analytics.thresholdSundays} Sundays ago`}
                      </span>
                      <Badge variant={member.neverAttended ? 'accent' : 'destructive'}>
                        {member.neverAttended
                          ? 'Never attended'
                          : `${member.sundaysInactive} Sundays`}
                      </Badge>
                      <Button variant="primaryOutline" size="xs" asChild>
                        <Link
                          to={toRoute('adminMemberDetail', { id: member.id })}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span>Profile</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Badge variant="outline" className="mr-auto text-xs">
          Total: {filteredMembers.length}
        </Badge>
        <Button
          type="button"
          variant="primaryOutline"
          onClick={handleExportCsv}
          disabled={filteredMembers.length === 0}
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </Button>
        <Button type="button" variant="outline" onClick={handleClose}>
          Close
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
