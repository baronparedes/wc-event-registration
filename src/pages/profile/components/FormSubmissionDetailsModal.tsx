import { AlertCircle, CheckCircle2, Clock, FileText, UserCheck, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { MemberFormSubmissionItem } from '@/lib/domain/forms';
import { formatDateTime } from '@/lib/infrastructure';

type Props = {
  submission: MemberFormSubmissionItem | null;
  isOpen: boolean;
  onClose: () => void;
};

export function FormSubmissionDetailsModal({ submission, isOpen, onClose }: Props) {
  if (!submission) return null;

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

  const renderApprovalStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Pending Review</Badge>;
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="2xl">
      <Dialog.Header showCloseButton onClose={onClose}>
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-lg bg-primary/10 p-2 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <Dialog.Title className="text-lg font-bold text-text">
              {submission.form_title}
            </Dialog.Title>
            <p className="text-xs text-muted">
              Submitted on {formatDateTime(submission.submitted_at)}
            </p>
          </div>
        </div>
      </Dialog.Header>

      <Dialog.Body className="space-y-6">
        {/* Overall Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Overall Status
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              {renderStatusBadge(submission.status)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted">Submission ID</span>
            <p className="font-mono text-xs font-medium text-text">{submission.submission_id}</p>
          </div>
        </div>

        {/* Approval Requirements Breakdown */}
        {submission.approval_requests.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-text">
              <UserCheck className="h-4 w-4 text-primary" />
              Approval Reviewers ({submission.approval_requests.length})
            </h4>
            <div className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
              {submission.approval_requests.map((req) => (
                <div key={req.id} className="p-3.5 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text">
                      {req.field_label || req.title || 'Required Approval'}
                    </span>
                    {renderApprovalStatusBadge(req.status)}
                  </div>
                  {req.assigned_to_email && (
                    <p className="text-xs text-muted">
                      Approver:{' '}
                      <span className="font-medium text-text">{req.assigned_to_email}</span>
                    </p>
                  )}
                  {req.decided_at && (
                    <p className="text-xs text-muted">
                      Decision Date: {formatDateTime(req.decided_at)}
                    </p>
                  )}
                  {req.decision_notes && (
                    <div className="mt-2 rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs text-text">
                      <span className="font-medium text-muted">Reviewer Notes: </span>
                      {req.decision_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submitted Answers (excluding approval fields already rendered above) */}
        {(() => {
          const userResponses = submission.answers.filter(
            (ans) => ans.field_type !== 'required_approval',
          );
          if (userResponses.length === 0) return null;

          return (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-text">Submitted Responses</h4>
              <div className="rounded-xl border border-border bg-background p-3.5 sm:p-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  {userResponses.map((ans) => {
                    const displayValue =
                      ans.answer_text ??
                      (ans.answer_number !== null ? String(ans.answer_number) : '—');

                    return (
                      <div key={ans.id} className="min-w-0">
                        <dt className="text-xs font-medium text-muted">{ans.label}</dt>
                        <dd className="mt-0.5 break-words text-sm font-semibold text-text">
                          {displayValue || '—'}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </div>
          );
        })()}
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="default" onClick={onClose} className="w-full sm:w-auto">
          Close
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
