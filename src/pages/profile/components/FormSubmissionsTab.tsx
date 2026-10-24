import { useState } from 'react';

import { AlertCircle, CheckCircle2, ChevronRight, Clock, FileText, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { useMemberFormSubmissionsQuery } from '@/hooks/domain/forms';
import type { MemberFormSubmissionItem } from '@/lib/domain/forms';
import { formatDateTime } from '@/lib/infrastructure';

import { FormSubmissionDetailsModal } from './FormSubmissionDetailsModal';

interface FormSubmissionsTabProps {
  memberId: string;
}

export function FormSubmissionsTab({ memberId }: FormSubmissionsTabProps) {
  const submissionsQuery = useMemberFormSubmissionsQuery(memberId);
  const [selectedSubmission, setSelectedSubmission] = useState<MemberFormSubmissionItem | null>(
    null,
  );

  const submissions = submissionsQuery.data ?? [];

  const renderStatusBadge = (status: MemberFormSubmissionItem['status']) => {
    switch (status) {
      case 'pending_approval':
        return (
          <Badge variant="secondary" icon={<Clock className="h-3.5 w-3.5" />}>
            Pending Approval
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" icon={<XCircle className="h-3.5 w-3.5" />}>
            Rejected
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" icon={<AlertCircle className="h-3.5 w-3.5" />}>
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="default" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
            Submitted
          </Badge>
        );
    }
  };

  return (
    <>
      <SectionCard
        title={`Form Submissions (${submissions.length})`}
        subtitle="All forms you have submitted and their review status."
      >
        {submissionsQuery.isLoading && (
          <p className="text-base text-muted">Loading form submissions...</p>
        )}
        {submissionsQuery.isError && (
          <p className="text-base text-danger">Failed to load form submissions.</p>
        )}
        {!submissionsQuery.isLoading && !submissionsQuery.isError && submissions.length === 0 && (
          <p className="text-base text-muted">No form submissions found.</p>
        )}

        {submissions.length > 0 && (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {submissions.map((sub) => {
              const approvalCount = sub.approval_requests.length;
              const approvedCount = sub.approval_requests.filter(
                (r) => r.status === 'approved',
              ).length;

              return (
                <button
                  key={sub.submission_id}
                  type="button"
                  onClick={() => setSelectedSubmission(sub)}
                  aria-label={`View ${sub.form_title} submission details`}
                  className="flex w-full items-center justify-between gap-3 bg-surface px-4 py-3.5 text-left transition-colors hover:bg-background/70 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-text">
                        {sub.form_title}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span>Submitted on {formatDateTime(sub.submitted_at)}</span>
                        {approvalCount > 0 && (
                          <span className="rounded-full bg-background px-2 py-0.5 font-medium text-text border border-border">
                            {approvedCount}/{approvalCount} Approvals
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {renderStatusBadge(sub.status)}
                    <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      <FormSubmissionDetailsModal
        submission={selectedSubmission}
        isOpen={selectedSubmission !== null}
        onClose={() => setSelectedSubmission(null)}
      />
    </>
  );
}
