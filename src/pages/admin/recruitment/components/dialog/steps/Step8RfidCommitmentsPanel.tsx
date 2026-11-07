import { useState } from 'react';

import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { Badge, Button, FormInputField, SundayAvailabilityTable } from '@/components/ui';
import type {
  ApplicantCommitments,
  RecruitmentApplication,
  RecruitmentServiceSlot,
} from '@/lib/domain/recruitment';

import { CompletedStepCard } from './CompletedStepCard';
import { LockedStepCard } from './LockedStepCard';

interface Step8RfidCommitmentsPanelProps {
  application: RecruitmentApplication;
  isCompletedStep: boolean;
  isFutureStep: boolean;
  isPending: boolean;
  onJumpToActive: () => void;
  onRequestComplete: (details: {
    rfidTag: string;
    serviceCommitments: ApplicantCommitments;
  }) => void;
}

export function Step8RfidCommitmentsPanel({
  application,
  isCompletedStep,
  isFutureStep,
  isPending,
  onJumpToActive,
  onRequestComplete,
}: Step8RfidCommitmentsPanelProps) {
  const [rfidTag, setRfidTag] = useState<string>(application.assigned_rfid_member_id ?? '');
  const [serviceCommitmentsLocal, setServiceCommitmentsLocal] = useState<ApplicantCommitments>(
    application.service_commitments ?? {},
  );

  const handleToggleSundaySlot = (
    sundayKey: keyof ApplicantCommitments,
    slot: RecruitmentServiceSlot,
    checked?: boolean,
  ) => {
    setServiceCommitmentsLocal((prev) => {
      const currentSlots = prev[sundayKey] ?? [];
      const isAlreadySelected = currentSlots.includes(slot);
      const shouldInclude = checked !== undefined ? checked : !isAlreadySelected;
      if (shouldInclude === isAlreadySelected) return prev;
      const nextSlots = shouldInclude
        ? [...currentSlots, slot]
        : currentSlots.filter((s) => s !== slot);
      return {
        ...prev,
        [sundayKey]: nextSlots,
      };
    });
  };

  if (isFutureStep) {
    return (
      <LockedStepCard
        stepNumber={8}
        currentStep={application.current_step}
        onJump={onJumpToActive}
      />
    );
  }

  const effectiveRfid = rfidTag || application.assigned_rfid_member_id || '';
  const hasSelectedCommitmentSlot = Object.values(serviceCommitmentsLocal).some(
    (slots) => (slots?.length ?? 0) > 0,
  );
  const canComplete = Boolean(effectiveRfid.trim() && hasSelectedCommitmentSlot);

  const missingDetails: string[] = [];
  if (!effectiveRfid.trim()) missingDetails.push('Assigned Physical RFID Tag');
  if (!hasSelectedCommitmentSlot) missingDetails.push('At least one committed Sunday service slot');

  return (
    <div className="space-y-3">
      {isCompletedStep && <CompletedStepCard stepNumber={8} />}

      <div className="space-y-2 rounded-xl border border-border bg-surface p-3.5 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-heading text-sm font-bold text-text">Sunday Availability</h4>
            <p className="text-[11px] text-muted">
              Manage member availability across all five Sundays.
            </p>
          </div>
          {!hasSelectedCommitmentSlot ? (
            <Badge variant="destructive">Required</Badge>
          ) : (
            <Badge variant="outline">{isCompletedStep ? 'Completed' : 'Configured'}</Badge>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <SundayAvailabilityTable
            value={serviceCommitmentsLocal}
            onChange={
              isCompletedStep
                ? undefined
                : (sundayKey, timeSlot, checked) => {
                    handleToggleSundaySlot(sundayKey, timeSlot, checked);
                  }
            }
            disabled={isCompletedStep}
            readOnly={isCompletedStep}
          />
        </div>
      </div>

      <FormInputField
        id="rfid-tag"
        label={
          isCompletedStep
            ? 'Assigned Physical RFID Tag (Member ID)'
            : 'Assigned Physical RFID Tag (Member ID) *'
        }
        placeholder="e.g. 1000123"
        disabled={isCompletedStep}
        readOnly={isCompletedStep}
        value={effectiveRfid}
        onChange={(event) => setRfidTag(event.target.value)}
        helperText={
          isCompletedStep
            ? undefined
            : 'Physical RFID tag number scanned or assigned to this volunteer.'
        }
      />

      {!isCompletedStep && !canComplete && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-semibold">Required before completing Step 8:</span>
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
              onRequestComplete({
                rfidTag: effectiveRfid,
                serviceCommitments: serviceCommitmentsLocal,
              })
            }
            disabled={isPending || !canComplete}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Save Commitments, Assign RFID & Complete Step 8
          </Button>
        </div>
      )}
    </div>
  );
}
