import { useState } from 'react';

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button, Skeleton } from '@/components/ui';
import {
  useApprovalReviewQuery,
  useSubmitApprovalDecisionMutation,
} from '@/hooks/domain/approvals';

export function ApprovalReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [decisionNotes, setDecisionNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'approved' | 'rejected' | null>(null);

  const { data: reviewData, isLoading, isError, error, refetch } = useApprovalReviewQuery(token);

  const { mutate: submitDecision, isPending: isSubmitting } = useSubmitApprovalDecisionMutation();

  const handleDecision = (decision: 'approved' | 'rejected') => {
    if (!token) return;

    if (decision === 'rejected' && !decisionNotes.trim()) {
      toast.error('Please provide a reason or note when declining a request.');
      return;
    }

    setSelectedAction(decision);
    submitDecision(
      {
        token,
        decision,
        notes: decisionNotes.trim() || null,
      },
      {
        onSuccess: (data) => {
          toast.success(data.message || `Request ${decision} successfully`);
          refetch();
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to submit decision');
          setSelectedAction(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !reviewData?.approval) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Invalid or Expired Link
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {error?.message ||
            'This approval link is invalid, has expired, or the request no longer exists.'}
        </p>
      </div>
    );
  }

  const { approval, entity_details } = reviewData;
  const isPending = approval.status === 'pending' && !approval.is_expired;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      {/* Top Banner / Status Indicator */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                approval.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : approval.status === 'rejected'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                    : approval.is_expired
                      ? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
              }`}
            >
              {approval.status === 'approved' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {approval.status === 'rejected' && <XCircle className="h-3.5 w-3.5" />}
              {approval.status === 'pending' && !approval.is_expired && (
                <Clock className="h-3.5 w-3.5" />
              )}
              {approval.is_expired ? 'Expired' : approval.status}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {approval.entity_type === 'form_submission'
                ? 'Form Registration'
                : 'Long Leave Request'}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100 sm:text-3xl">
            {approval.title}
          </h1>
        </div>

        <div className="text-sm text-neutral-500 dark:text-neutral-400 sm:text-right">
          <div>Submitted on</div>
          <div className="font-medium text-neutral-700 dark:text-neutral-300">
            {new Date(approval.created_at).toLocaleDateString(undefined, {
              dateStyle: 'medium',
            })}
          </div>
        </div>
      </div>

      {/* Decision Summary Banner if already decided */}
      {approval.status !== 'pending' && (
        <div
          className={`rounded-xl border p-4 ${
            approval.status === 'approved'
              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50/50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300'
          }`}
        >
          <div className="flex items-start gap-3">
            {approval.status === 'approved' ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-400" />
            )}
            <div>
              <p className="font-semibold">
                This request was {approval.status}
                {approval.decided_by_email && ` by ${approval.decided_by_email}`}
                {approval.decided_at &&
                  ` on ${new Date(approval.decided_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}`}
              </p>
              {approval.decision_notes && (
                <p className="mt-1 text-sm opacity-90">
                  <span className="font-medium">Note:</span> {approval.decision_notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expiration Notice if expired and still pending */}
      {approval.status === 'pending' && approval.is_expired && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <p className="text-sm">
            This review link expired on {new Date(approval.token_expires_at).toLocaleDateString()}.
            Please contact an administrator if action is still required.
          </p>
        </div>
      )}

      {/* Applicant / Volunteer Card */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          <User className="h-4 w-4" />
          Applicant Details
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Full Name</div>
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {approval.requester_name}
            </div>
          </div>
          {approval.requester_email && (
            <div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Email Address</div>
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {approval.requester_email}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Section: Form Answers or Leave Details */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {approval.entity_type === 'form_submission' ? (
            <FileText className="h-4 w-4" />
          ) : (
            <Calendar className="h-4 w-4" />
          )}
          {approval.entity_type === 'form_submission'
            ? 'Submission Responses'
            : 'Leave Schedule & Reason'}
        </h2>

        {approval.entity_type === 'form_submission' && entity_details && (
          <div className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
            {Array.isArray(
              (entity_details as { form_submission_answers?: unknown[] }).form_submission_answers,
            ) &&
            (
              entity_details as {
                form_submission_answers: Array<{
                  id: string;
                  answer_text: string | null;
                  form_fields?: { label: string; field_type: string };
                }>;
              }
            ).form_submission_answers.length > 0 ? (
              (
                entity_details as {
                  form_submission_answers: Array<{
                    id: string;
                    answer_text: string | null;
                    form_fields?: { label: string; field_type: string };
                  }>;
                }
              ).form_submission_answers.map((answer) => (
                <div key={answer.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {answer.form_fields?.label || 'Field'}
                  </div>
                  <div className="mt-0.5 text-sm text-neutral-900 dark:text-neutral-100">
                    {answer.answer_text || '—'}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-3 text-sm text-neutral-500 italic">No field answers recorded.</p>
            )}
          </div>
        )}

        {approval.entity_type === 'service_excuse' && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Leave Period</div>
                <div className="mt-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {String(
                    (entity_details as { start_date?: string })?.start_date ||
                      (approval.metadata as { start_date?: string })?.start_date ||
                      '—',
                  )}{' '}
                  to{' '}
                  {String(
                    (entity_details as { end_date?: string })?.end_date ||
                      (approval.metadata as { end_date?: string })?.end_date ||
                      '—',
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Services</div>
                <div className="mt-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {Array.isArray(
                    (entity_details as { services?: string[] })?.services ||
                      (approval.metadata as { services?: string[] })?.services,
                  )
                    ? (
                        (entity_details as { services?: string[] })?.services ||
                        (approval.metadata as { services?: string[] })?.services
                      )?.join(', ')
                    : 'All Services'}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Reason for Leave</div>
              <div className="mt-1 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                {String(
                  (entity_details as { reason?: string })?.reason ||
                    (approval.metadata as { reason?: string })?.reason ||
                    'No reason provided.',
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Decision Action Area (When pending and valid) */}
      {isPending && (
        <div className="rounded-xl border border-neutral-300 bg-surface p-5 shadow-xs dark:border-neutral-700">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            <MessageSquare className="h-4 w-4" />
            Decision & Notes
          </h2>

          <div className="mt-3">
            <label
              htmlFor="decision-notes"
              className="block text-xs font-medium text-neutral-600 dark:text-neutral-400"
            >
              Notes / Feedback for Applicant (Optional for approval, required if declining)
            </label>
            <textarea
              id="decision-notes"
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="e.g. Approved. Thank you for your commitment to our community."
              disabled={isSubmitting}
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm text-neutral-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleDecision('rejected')}
              className="w-full sm:w-auto border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              {isSubmitting && selectedAction === 'rejected' ? 'Declining...' : 'Decline Request'}
            </Button>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDecision('approved')}
              className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {isSubmitting && selectedAction === 'approved' ? 'Approving...' : 'Approve Request'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
export default ApprovalReviewPage;
