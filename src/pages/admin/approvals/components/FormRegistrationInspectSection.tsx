import { ClipboardList, FileText } from 'lucide-react';

import { Badge } from '@/components/ui';
import type { ApprovalRequest } from '@/lib/domain/approvals';

import { extractFormSubmissionResponses, renderFormResponseRow } from './helpers';

export interface FormRegistrationInspectSectionProps {
  request: ApprovalRequest;
}

export function FormRegistrationInspectSection({ request }: FormRegistrationInspectSectionProps) {
  const { targetFieldLabel, formSlug, responses } = extractFormSubmissionResponses(
    request.metadata,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 pt-1">
        <div>
          <h4 className="font-heading text-sm font-bold text-text">Form Registration Details</h4>
          <p className="text-xs text-muted">
            Registration responses and applicant submission details.
          </p>
        </div>
        <Badge variant="outline">
          {targetFieldLabel ? 'Targeted Sign-off' : 'Form Registration'}
        </Badge>
      </div>

      {/* Section 1: Form & Sign-off Target */}
      {(targetFieldLabel || formSlug || request.summary) && (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <h5 className="font-heading text-sm font-semibold text-text">Form & Sign-off Target</h5>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {targetFieldLabel && (
              <div>
                <span className="text-xs font-medium text-muted block">Approval Requirement</span>
                <div className="mt-1">
                  <Badge variant="outline" className="text-xs font-medium">
                    {targetFieldLabel}
                  </Badge>
                </div>
              </div>
            )}
            {formSlug && (
              <div>
                <span className="text-xs font-medium text-muted block">Form Identifier</span>
                <span className="mt-1 inline-block font-mono text-xs text-text font-semibold">
                  {formSlug}
                </span>
              </div>
            )}
            {request.summary && (
              <div className="col-span-full">
                <span className="text-xs font-medium text-muted block">Summary</span>
                <p className="mt-0.5 text-xs text-text font-medium">{request.summary}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 2: Submission Responses */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary shrink-0" />
            <h5 className="font-heading text-sm font-semibold text-text">Submission Responses</h5>
          </div>
          <Badge variant="outline">
            {responses.length} {responses.length === 1 ? 'Answer' : 'Answers'}
          </Badge>
        </div>

        {responses.length > 0 ? (
          <div className="divide-y divide-border/60">
            {responses.map((entry) => renderFormResponseRow(entry))}
          </div>
        ) : (
          <p className="text-xs text-muted italic py-2">No submission answers recorded.</p>
        )}
      </div>
    </div>
  );
}
