import { useState } from 'react';

import { Check, ClipboardCopy } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Dialog } from '@/components/ui';
import type { FormSubmission, FormSubmissionAnswer } from '@/lib/domain/forms';

interface SubmissionDetailDialogProps {
  submission: FormSubmission | null;
  isOpen: boolean;
  onClose: () => void;
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

function formatAnswerValue(ans: FormSubmissionAnswer): string {
  if (ans.answer_text !== null && ans.answer_text !== undefined) {
    return ans.answer_text;
  }
  if (ans.answer_number !== null && ans.answer_number !== undefined) {
    return String(ans.answer_number);
  }
  if (ans.answer_boolean !== null && ans.answer_boolean !== undefined) {
    return ans.answer_boolean ? 'Yes' : 'No';
  }
  if (ans.answer_date) {
    const d = new Date(ans.answer_date);
    return isNaN(d.getTime()) ? ans.answer_date : d.toLocaleDateString('en-US');
  }
  if (ans.answer_json !== null && ans.answer_json !== undefined) {
    if (Array.isArray(ans.answer_json)) {
      return ans.answer_json.join(', ');
    }
    if (typeof ans.answer_json === 'object') {
      return Object.entries(ans.answer_json as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(', ');
    }
    return String(ans.answer_json);
  }
  return '—';
}

export function SubmissionDetailDialog({
  submission,
  isOpen,
  onClose,
}: SubmissionDetailDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!submission) return null;

  const isMember = submission.source === 'member';
  const respondentName =
    submission.users?.full_name ||
    [submission.public_registrant_info?.first_name, submission.public_registrant_info?.last_name]
      .filter(Boolean)
      .join(' ') ||
    'Anonymous';

  const answers = submission.form_submission_answers ?? [];

  const handleCopyAnswers = async () => {
    const lines = [
      `Respondent: ${respondentName}`,
      `Source: ${submission.source}`,
      `Submitted: ${formatDate(submission.submitted_at)}`,
      ...(submission.users?.member_id ? [`Member ID: ${submission.users.member_id}`] : []),
      ...(submission.users?.email ? [`Email: ${submission.users.email}`] : []),
      ...(submission.public_registrant_info?.email
        ? [`Email: ${submission.public_registrant_info.email}`]
        : []),
      ...(submission.public_registrant_info?.phone
        ? [`Phone: ${submission.public_registrant_info.phone}`]
        : []),
      '',
      '--- Answers ---',
      ...answers.map((ans) => {
        const label = ans.form_fields?.label || ans.form_fields?.field_key || 'Question';
        const val = formatAnswerValue(ans);
        return `${label}: ${val}`;
      }),
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      toast.success('Answers copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy answers');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      showCloseIcon
      title="Submission Details"
      description={
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              isMember ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
            }`}
          >
            {submission.source}
          </span>
          <span>
            {respondentName} • Submitted on {formatDate(submission.submitted_at)}
          </span>
        </div>
      }
    >
      <div className="flex max-h-[75vh] flex-col">
        {/* Content Body */}
        <div className="flex-1 space-y-6 overflow-y-auto pr-1">
          {/* Respondent Metadata */}
          <div className="rounded-xl border border-border bg-background/50 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Respondent Information
            </h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Name</dt>
                <dd className="mt-0.5 text-sm font-medium text-text">{respondentName}</dd>
              </div>
              {isMember && submission.users?.member_id && (
                <div>
                  <dt className="text-xs text-muted">Member ID</dt>
                  <dd className="mt-0.5 text-sm font-medium text-text">
                    {submission.users.member_id}
                  </dd>
                </div>
              )}
              {isMember && submission.users?.email && (
                <div>
                  <dt className="text-xs text-muted">Email</dt>
                  <dd className="mt-0.5 text-sm font-medium text-text">{submission.users.email}</dd>
                </div>
              )}
              {!isMember && submission.public_registrant_info?.email && (
                <div>
                  <dt className="text-xs text-muted">Email</dt>
                  <dd className="mt-0.5 text-sm font-medium text-text">
                    {submission.public_registrant_info.email}
                  </dd>
                </div>
              )}
              {!isMember && submission.public_registrant_info?.phone && (
                <div>
                  <dt className="text-xs text-muted">Phone</dt>
                  <dd className="mt-0.5 text-sm font-medium text-text">
                    {submission.public_registrant_info.phone}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted">Submission ID</dt>
                <dd className="mt-0.5 truncate font-mono text-xs text-muted">{submission.id}</dd>
              </div>
            </dl>
          </div>

          {/* Form Answers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Form Answers ({answers.length})
              </h3>
            </div>

            {answers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                No answers captured for this submission.
              </div>
            ) : (
              <div className="space-y-3">
                {answers.map((ans) => {
                  const label = ans.form_fields?.label || ans.form_fields?.field_key || 'Question';
                  const fieldType = ans.form_fields?.field_type?.replace(/_/g, ' ') || 'text';
                  const formattedVal = formatAnswerValue(ans);

                  return (
                    <div
                      key={ans.id}
                      className="rounded-xl border border-border bg-background p-4 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-text">{label}</span>
                        <span className="inline-flex rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium capitalize text-muted">
                          {fieldType}
                        </span>
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap text-text/90">
                        {formattedVal}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="primaryOutline"
            size="sm"
            onClick={handleCopyAnswers}
            disabled={answers.length === 0}
            className="flex items-center gap-1.5"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <ClipboardCopy className="h-4 w-4" />
            )}
            {copied ? 'Copied' : 'Copy Answers'}
          </Button>

          <Button type="button" variant="primaryOutline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
