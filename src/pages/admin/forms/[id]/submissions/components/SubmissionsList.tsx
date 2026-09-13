import { ClipboardList, Eye } from 'lucide-react';

import { Button, EmptyState } from '@/components/ui';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import type { FormSubmission } from '@/lib/domain/forms';

interface SubmissionsListProps {
  submissions: FormSubmission[];
  isLoading?: boolean;
  searchTerm?: string;
  onSelectSubmission: (submission: FormSubmission) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SubmissionsList({
  submissions,
  isLoading,
  searchTerm,
  onSelectSubmission,
}: SubmissionsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted">
        Loading submissions...
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="px-6 py-12">
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title={searchTerm && searchTerm.length > 0 ? 'No matches found' : 'No submissions yet'}
          description={
            searchTerm && searchTerm.length > 0
              ? 'Try adjusting your search query or source filter'
              : 'Submissions will appear here once members or guests submit this form'
          }
        />
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <ListTable density="dense">
          <ListTableHead>
            <ListTableHeaderRow variant="plain">
              <ListTableHeaderCell className="px-6">Respondent</ListTableHeaderCell>
              <ListTableHeaderCell>Identifier / Contact</ListTableHeaderCell>
              <ListTableHeaderCell>Source</ListTableHeaderCell>
              <ListTableHeaderCell>Answers</ListTableHeaderCell>
              <ListTableHeaderCell>Submitted</ListTableHeaderCell>
              <ListTableHeaderCell className="text-right pr-6">Actions</ListTableHeaderCell>
            </ListTableHeaderRow>
          </ListTableHead>
          <ListTableBody divider="none">
            {submissions.map((sub) => {
              const isMember = sub.source === 'member';
              const respondentName =
                sub.users?.full_name ||
                [sub.public_registrant_info?.first_name, sub.public_registrant_info?.last_name]
                  .filter(Boolean)
                  .join(' ') ||
                'Anonymous';

              const identifier = isMember
                ? sub.users?.member_id || sub.users?.email || '—'
                : sub.public_registrant_info?.email || sub.public_registrant_info?.phone || '—';

              const answerCount = sub.form_submission_answers?.length ?? 0;

              return (
                <ListTableRow
                  key={sub.id}
                  className="cursor-pointer border-b border-border/60 transition-colors hover:bg-background/80"
                  onClick={() => onSelectSubmission(sub)}
                >
                  <ListTableCell className="px-6">
                    <p className="font-medium text-text">{respondentName}</p>
                    {isMember && sub.users?.email && (
                      <p className="text-xs text-muted">{sub.users.email}</p>
                    )}
                  </ListTableCell>

                  <ListTableCell>
                    <span className="font-mono text-xs text-text">{identifier}</span>
                  </ListTableCell>

                  <ListTableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        isMember ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                      }`}
                    >
                      {sub.source}
                    </span>
                  </ListTableCell>

                  <ListTableCell>
                    <span className="text-xs text-muted">
                      {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
                    </span>
                  </ListTableCell>

                  <ListTableCell className="text-xs text-muted">
                    {formatDate(sub.submitted_at)}
                  </ListTableCell>

                  <ListTableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      size="sm"
                      variant="primaryOutline"
                      onClick={() => onSelectSubmission(sub)}
                      className="inline-flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Answers
                    </Button>
                  </ListTableCell>
                </ListTableRow>
              );
            })}
          </ListTableBody>
        </ListTable>
      </div>

      {/* Mobile Card List */}
      <div className="divide-y divide-border/60 md:hidden">
        {submissions.map((sub) => {
          const isMember = sub.source === 'member';
          const respondentName =
            sub.users?.full_name ||
            [sub.public_registrant_info?.first_name, sub.public_registrant_info?.last_name]
              .filter(Boolean)
              .join(' ') ||
            'Anonymous';

          const identifier = isMember
            ? sub.users?.member_id || sub.users?.email || '—'
            : sub.public_registrant_info?.email || sub.public_registrant_info?.phone || '—';

          const answerCount = sub.form_submission_answers?.length ?? 0;

          return (
            <div
              key={sub.id}
              className="cursor-pointer space-y-2 p-4 transition-colors hover:bg-background/60"
              onClick={() => onSelectSubmission(sub)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-text">{respondentName}</p>
                  <p className="text-xs text-muted">{identifier}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    isMember ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                  }`}
                >
                  {sub.source}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs text-muted">
                <span>{formatDate(sub.submitted_at)}</span>
                <span className="font-medium text-text">
                  {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
                </span>
              </div>

              <div className="pt-2 text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="primaryOutline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSubmission(sub);
                  }}
                  className="w-full"
                >
                  View Answers
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
