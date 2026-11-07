import { useState } from 'react';

import { CheckCircle2 } from 'lucide-react';

import { Button, FormErrorSummary, FormInputField } from '@/components/ui';
import { useFormErrorFocus } from '@/hooks/utils';
import type { RecruitmentApplication } from '@/lib/domain/recruitment';
import { formatDateTime } from '@/lib/infrastructure';

import { CompletedStepCard } from './CompletedStepCard';
import { LockedStepCard } from './LockedStepCard';

interface Step7VmtRegistrationPanelProps {
  application: RecruitmentApplication;
  isCompletedStep: boolean;
  isFutureStep: boolean;
  isPending: boolean;
  onJumpToActive: () => void;
  onRequestComplete: (details: { ccfVmtId: string; ccfVmtDate: string }) => void;
}

export function Step7VmtRegistrationPanel({
  application,
  isCompletedStep,
  isFutureStep,
  isPending,
  onJumpToActive,
  onRequestComplete,
}: Step7VmtRegistrationPanelProps) {
  const [ccfVmtId, setCcfVmtId] = useState<string>(application.ccf_vmt_id ?? '');
  const [ccfVmtDate, setCcfVmtDate] = useState<string>(application.ccf_vmt_date ?? '');
  const { focusFirstError } = useFormErrorFocus();

  if (isFutureStep) {
    return (
      <LockedStepCard
        stepNumber={7}
        currentStep={application.current_step}
        onJump={onJumpToActive}
      />
    );
  }

  const effectiveVmtId = ccfVmtId || application.ccf_vmt_id || '';
  const effectiveVmtDate = ccfVmtDate || application.ccf_vmt_date || '';
  const canComplete = Boolean(effectiveVmtId.trim() && effectiveVmtDate.trim());

  const missingDetails: string[] = [];
  if (!effectiveVmtId.trim()) missingDetails.push('CCF VMT ID');
  if (!effectiveVmtDate.trim()) missingDetails.push('CCF VMT Registration Date');

  return (
    <div className="space-y-3">
      {isCompletedStep && <CompletedStepCard stepNumber={7} />}

      <div className="text-xs">
        <p>
          <strong>Applicant Self-Attestation:</strong>{' '}
          {application.vmt_registered ? (
            <span className="text-primary font-semibold">
              Completed on {formatDateTime(application.vmt_registered_at)}
            </span>
          ) : (
            <span className="text-muted">Pending applicant confirmation</span>
          )}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormInputField
          id="ccfVmtId"
          label={isCompletedStep ? 'CCF VMT ID' : 'CCF VMT ID *'}
          placeholder="e.g. VMT-12345"
          disabled={isCompletedStep}
          readOnly={isCompletedStep}
          value={effectiveVmtId}
          onChange={(event) => setCcfVmtId(event.target.value)}
        />

        <FormInputField
          id="ccfVmtDate"
          label={isCompletedStep ? 'CCF VMT Registration Date' : 'CCF VMT Registration Date *'}
          type="date"
          disabled={isCompletedStep}
          readOnly={isCompletedStep}
          value={effectiveVmtDate}
          onChange={(event) => setCcfVmtDate(event.target.value)}
        />
      </div>

      {!isCompletedStep && !canComplete && (
        <FormErrorSummary
          errorCount={missingDetails.length}
          title="Required before completing Step 7:"
          onJumpToFirstError={() => {
            if (!effectiveVmtId.trim()) focusFirstError(['ccfVmtId']);
            else focusFirstError(['ccfVmtDate']);
          }}
          actionLabel="Jump to missing field"
        >
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs text-text">
            {missingDetails.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </FormErrorSummary>
      )}

      {!isCompletedStep && (
        <div className="border-t border-border pt-3.5">
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() =>
              onRequestComplete({ ccfVmtId: effectiveVmtId, ccfVmtDate: effectiveVmtDate })
            }
            disabled={isPending || !canComplete}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Verify & Complete Step 7
          </Button>
        </div>
      )}
    </div>
  );
}
