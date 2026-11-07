import { UserPlus } from 'lucide-react';

import { Badge, Button, Spinner, SundayAvailabilityTable } from '@/components/ui';
import type { ApplicantCommitments, RecruitmentApplication } from '@/lib/domain/recruitment';
import { formatDateTime } from '@/lib/infrastructure';

import { LockedStepCard } from './LockedStepCard';

interface Step9DeploymentPanelProps {
  application: RecruitmentApplication;
  confirmedRole: string;
  isFutureStep: boolean;
  canDeploy: boolean;
  isPendingDeploy: boolean;
  onJumpToActive: () => void;
  onRequestDeploy: () => void;
}

export function Step9DeploymentPanel({
  application,
  confirmedRole,
  isFutureStep,
  canDeploy,
  isPendingDeploy,
  onJumpToActive,
  onRequestDeploy,
}: Step9DeploymentPanelProps) {
  if (isFutureStep) {
    return (
      <LockedStepCard
        stepNumber={9}
        currentStep={application.current_step}
        onJump={onJumpToActive}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs space-y-2">
        <div className="space-y-1">
          <p>
            <strong>Volunteer:</strong> {application.full_name} ({confirmedRole})
          </p>
          <p>
            <strong>RFID / Member ID:</strong>{' '}
            {application.assigned_rfid_member_id || 'Not assigned yet'}
          </p>
          <p>
            <strong>Status:</strong>{' '}
            {application.status === 'deployed' ? (
              <span className="text-primary font-bold">
                Deployed on {formatDateTime(application.deployed_at)}
              </span>
            ) : (
              <span>Ready for final deployment into Welcome Center membership</span>
            )}
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-surface p-3.5 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-heading text-sm font-bold text-text">Sunday Availability</h5>
              <p className="text-[11px] text-muted">Committed volunteer schedule for deployment.</p>
            </div>
            <Badge variant="outline">Confirmed</Badge>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <SundayAvailabilityTable
              value={(application.service_commitments ?? {}) as ApplicantCommitments}
              readOnly
            />
          </div>
        </div>
      </div>

      {application.status !== 'deployed' && (
        <div className="border-t border-border pt-3.5">
          {canDeploy ? (
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onRequestDeploy}
              disabled={isPendingDeploy || !application.assigned_rfid_member_id}
            >
              {isPendingDeploy ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Deploying...
                </>
              ) : (
                <>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Deploy Volunteer to Welcome Center
                </>
              )}
            </Button>
          ) : (
            <p className="text-xs text-muted italic">
              Final Step 9 Deployment to active Welcome Center member is reserved for Admins and
              SLODs.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
