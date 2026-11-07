import { useState } from 'react';

import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { Button, FormInputField } from '@/components/ui';
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
          label={isCompletedStep ? 'CCF VMT ID' : 'CCF VMT ID *'}
          placeholder="e.g. VMT-12345"
          disabled={isCompletedStep}
          readOnly={isCompletedStep}
          value={effectiveVmtId}
          onChange={(event) => setCcfVmtId(event.target.value)}
        />

        <FormInputField
          label={isCompletedStep ? 'CCF VMT Registration Date' : 'CCF VMT Registration Date *'}
          type="date"
          disabled={isCompletedStep}
          readOnly={isCompletedStep}
          value={effectiveVmtDate}
          onChange={(event) => setCcfVmtDate(event.target.value)}
        />
      </div>

      {!isCompletedStep && !canComplete && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-semibold">Required before completing Step 7:</span>
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] text-text">
              {missingDetails.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
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
