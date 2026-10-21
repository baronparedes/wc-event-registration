import { useMemo, useState } from 'react';

import { ExternalLink, ShieldCheck, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ButtonGroup, type ButtonGroupOption } from '@/components/ui/ButtonGroup';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import {
  MobileCard,
  MobileCardActionLink,
  MobileCardActions,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardDivider,
  MobileCardHeader,
} from '@/components/ui/MobileCard';
import { SearchInputField } from '@/components/ui/SearchInputField';
import { SectionCard } from '@/components/ui/SectionCard';
import { toRoute } from '@/config/constants';
import { useIsMobileViewport } from '@/hooks/utils';
import type { MemberDGroupAnalytics, MemberDGroupRow } from '@/lib/domain/members';

type DGroupFilterTab = 'all' | 'in_dgroup' | 'leaders' | 'members' | 'no_dgroup';

function getDGroupStatusBadgeVariant(status: string): BadgeVariant {
  const normalized = status.toLowerCase().trim();
  if (normalized === 'leader') return 'default'; // primary
  if (normalized === 'member' || normalized === 'active') return 'secondary';
  return 'outline';
}

interface MemberDGroupSectionProps {
  analytics: MemberDGroupAnalytics;
}

const PAGE_SIZE = 25;

export function MemberDGroupSection({ analytics }: MemberDGroupSectionProps) {
  const isMobile = useIsMobileViewport();
  const [activeTab, setActiveTab] = useState<DGroupFilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const dgroupMemberCount =
    analytics.dgroupMemberCount ??
    Math.max(0, analytics.inDGroupCount - analytics.dgroupLeaderCount);

  const filterOptions: ButtonGroupOption<DGroupFilterTab>[] = [
    {
      value: 'all',
      label: `All (${analytics.totalMembers})`,
    },
    {
      value: 'in_dgroup',
      label: `In DGroup (${analytics.inDGroupCount})`,
    },
    {
      value: 'leaders',
      label: `Leaders (${analytics.dgroupLeaderCount})`,
    },
    {
      value: 'members',
      label: `Members (${dgroupMemberCount})`,
    },
    {
      value: 'no_dgroup',
      label: `No DGroup (${analytics.missingDGroupCount})`,
    },
  ];

  const filteredMembers = useMemo(() => {
    let list = analytics.members;

    // Filter by tab
    if (activeTab === 'in_dgroup') {
      list = list.filter((m) => m.hasDGroup);
    } else if (activeTab === 'leaders') {
      list = list.filter((m) => m.isDGroupLeader);
    } else if (activeTab === 'members') {
      list = list.filter((m) => m.hasDGroup && !m.isDGroupLeader);
    } else if (activeTab === 'no_dgroup') {
      list = list.filter((m) => !m.hasDGroup);
    }

    // Filter by search query
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (m) =>
          m.fullName.toLowerCase().includes(query) ||
          m.memberId.toLowerCase().includes(query) ||
          m.role.toLowerCase().includes(query) ||
          (m.dgroupLeader && m.dgroupLeader.toLowerCase().includes(query)) ||
          (m.dgroupStatus && m.dgroupStatus.toLowerCase().includes(query)),
      );
    }

    return list;
  }, [analytics.members, activeTab, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / PAGE_SIZE) || 1;
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredMembers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredMembers, currentPage]);

  const handleTabChange = (tab: DGroupFilterTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <SectionCard
      title={
        <div className="flex items-center gap-2.5 font-heading text-lg font-semibold text-text">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
            <UserCheck className="h-4 w-4" />
          </div>
          <span>DGroup Directory & Member Records</span>
        </div>
      }
      subtitle={`Detailed DGroup status and leader tracking across all active members (${analytics.coveragePercentage}% participation rate)`}
    >
      <div className="mt-4 flex flex-col gap-4">
        {/* Controls toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="overflow-x-auto">
            <ButtonGroup<DGroupFilterTab>
              value={activeTab}
              onChange={handleTabChange}
              options={filterOptions}
              size="sm"
            />
          </div>

          <div className="w-full sm:w-72">
            <SearchInputField
              placeholder="Search member, leader, or status..."
              value={searchTerm}
              onChange={handleSearchChange}
              onClear={handleClearSearch}
            />
          </div>
        </div>

        {/* Results count banner */}
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Showing {filteredMembers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filteredMembers.length)} of {filteredMembers.length}{' '}
            members
          </span>
          {totalPages > 1 && (
            <span>
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>

        {/* Member listings */}
        {filteredMembers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted">
            {searchTerm
              ? 'No members found matching your search criteria.'
              : 'No members found in this view.'}
          </div>
        ) : isMobile ? (
          /* Mobile cards */
          <div className="flex flex-col gap-3">
            {paginatedMembers.map((member) => (
              <MobileMemberDGroupCard key={member.id} member={member} />
            ))}
          </div>
        ) : (
          /* Desktop table */
          <div className="overflow-hidden rounded-xl border border-border">
            <ListTable>
              <ListTableHead>
                <ListTableHeaderRow>
                  <ListTableHeaderCell>Member</ListTableHeaderCell>
                  <ListTableHeaderCell>Role</ListTableHeaderCell>
                  <ListTableHeaderCell>DGroup Leader</ListTableHeaderCell>
                  <ListTableHeaderCell>Status</ListTableHeaderCell>
                  <ListTableHeaderCell>Member Since</ListTableHeaderCell>
                  <ListTableHeaderCell className="text-right">Action</ListTableHeaderCell>
                </ListTableHeaderRow>
              </ListTableHead>
              <ListTableBody>
                {paginatedMembers.map((member) => (
                  <ListTableRow key={member.id} className="hover:bg-background/60">
                    <ListTableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          avatarObjectKey={member.avatarObjectKey}
                          name={member.fullName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text">{member.fullName}</p>
                          <p className="text-xs text-muted">{member.memberId}</p>
                        </div>
                      </div>
                    </ListTableCell>
                    <ListTableCell>
                      <Badge variant="primaryOutline" className="text-xs font-normal">
                        {member.role}
                      </Badge>
                    </ListTableCell>
                    <ListTableCell>
                      {member.dgroupLeader ? (
                        <span className="text-sm text-text font-medium">{member.dgroupLeader}</span>
                      ) : member.isDGroupLeader ? (
                        <Badge variant="accent" className="gap-1 font-semibold">
                          <ShieldCheck className="h-3 w-3" />
                          <span>DGroup Leader</span>
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted italic">None</span>
                      )}
                    </ListTableCell>
                    <ListTableCell>
                      {member.dgroupStatus ? (
                        <Badge variant={getDGroupStatusBadgeVariant(member.dgroupStatus)}>
                          {member.dgroupStatus}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted italic">—</span>
                      )}
                    </ListTableCell>
                    <ListTableCell>
                      <span className="text-xs text-muted">{member.dgroupMemberSince || '—'}</span>
                    </ListTableCell>
                    <ListTableCell className="text-right">
                      <Link
                        to={toRoute('adminMemberDetail', { id: member.id })}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <span>View</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </ListTableCell>
                  </ListTableRow>
                ))}
              </ListTableBody>
            </ListTable>
          </div>
        )}

        {/* Pagination buttons */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function MobileMemberDGroupCard({ member }: { member: MemberDGroupRow }) {
  const statusBadgeVariant = member.dgroupStatus
    ? getDGroupStatusBadgeVariant(member.dgroupStatus)
    : member.isDGroupLeader
      ? 'default'
      : 'outline';
  const statusLabel =
    member.dgroupStatus ||
    (member.isDGroupLeader ? 'Leader' : member.hasDGroup ? 'In DGroup' : 'No DGroup');

  return (
    <MobileCard>
      <MobileCardBody>
        <MobileCardHeader>
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              avatarObjectKey={member.avatarObjectKey}
              name={member.fullName}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold leading-snug text-text">
                {member.fullName}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs text-muted">
                <span>{member.memberId}</span>
                <span>•</span>
                <Badge variant="primaryOutline" className="text-[10px] px-1.5 py-0 font-normal">
                  {member.role}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant={statusBadgeVariant}>{statusLabel}</Badge>
          </div>
        </MobileCardHeader>

        <MobileCardDivider />

        <MobileCardContent>
          <MobileCardContentItem
            label="DGroup Leader"
            value={
              member.dgroupLeader ? (
                <span className="font-medium text-text">{member.dgroupLeader}</span>
              ) : member.isDGroupLeader ? (
                <Badge variant="accent" className="gap-1 font-semibold text-xs">
                  <ShieldCheck className="h-3 w-3" />
                  <span>DGroup Leader</span>
                </Badge>
              ) : (
                <span className="text-muted italic">None</span>
              )
            }
          />
          <MobileCardContentItem label="Member Since" value={member.dgroupMemberSince || '—'} />
        </MobileCardContent>
      </MobileCardBody>

      <MobileCardActions>
        <MobileCardActionLink
          to={toRoute('adminMemberDetail', { id: member.id })}
          variant="outline"
        >
          <ExternalLink className="h-4 w-4" />
          View Member Profile
        </MobileCardActionLink>
      </MobileCardActions>
    </MobileCard>
  );
}
