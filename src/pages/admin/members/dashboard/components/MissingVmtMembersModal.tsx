import { useMemo, useState } from 'react';

import { Database, Download, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { SearchInputField } from '@/components/ui/SearchInputField';
import { toRoute } from '@/config/constants';
import {
  type MemberVmtMigrationAnalytics,
  type VmtMigrationMissingMemberRow,
  buildMissingVmtMembersCsvExport,
} from '@/lib/domain/members';

interface MissingVmtMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: MemberVmtMigrationAnalytics;
}

function getMissingStatusBadge(member: VmtMigrationMissingMemberRow): {
  label: string;
  variant: BadgeVariant;
} {
  if (!member.hasCcfVmtId && !member.hasCcfVmtDate) {
    return { label: 'Missing ID & Date', variant: 'destructive' };
  }
  if (!member.hasCcfVmtId) {
    return { label: 'Missing VMT ID', variant: 'accent' };
  }
  return { label: 'Missing VMT Date', variant: 'accent' };
}

export function MissingVmtMembersModal({
  isOpen,
  onClose,
  analytics,
}: MissingVmtMembersModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  const filteredMembers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return analytics.missingMembers;
    return analytics.missingMembers.filter(
      (member) =>
        member.fullName.toLowerCase().includes(query) ||
        member.memberId.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query),
    );
  }, [analytics.missingMembers, searchTerm]);

  const handleExportCsv = () => {
    if (filteredMembers.length === 0) return;

    const { csvText, filename } = buildMissingVmtMembersCsvExport(filteredMembers);
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
      `Exported ${filteredMembers.length} member${filteredMembers.length === 1 ? '' : 's'} missing CCF VMT data to CSV`,
    );
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="4xl">
      <Dialog.Header showCloseButton onClose={handleClose}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-text">
            <Database className="h-4 w-4" />
          </div>
          <Dialog.Title>Missing CCF VMT Data</Dialog.Title>
        </div>
        <Dialog.Description>
          {analytics.missingCount} of {analytics.totalMembers} active member
          {analytics.totalMembers === 1 ? '' : 's'} missing ccf_vmt_id or ccf_vmt_date (
          {analytics.migratedPercentage}% migrated)
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body>
        <div className="flex flex-col gap-3">
          {analytics.missingMembers.length > 0 && (
            <SearchInputField
              ariaLabel="Search members missing CCF VMT data"
              placeholder="Search members by name, ID, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          )}

          {filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              {searchTerm
                ? 'No members found matching your search.'
                : 'All active members have both ccf_vmt_id and ccf_vmt_date recorded.'}
            </div>
          ) : (
            <div className="max-h-[55vh] lg:max-h-[68vh] overflow-y-auto pr-1">
              <div className="divide-y divide-border/60 rounded-xl border border-border bg-surface">
                {filteredMembers.map((member) => {
                  const statusBadge = getMissingStatusBadge(member);

                  return (
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
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
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
                  );
                })}
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
