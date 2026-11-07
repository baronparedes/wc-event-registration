import { useState } from 'react';

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  Mail,
  Phone,
  RefreshCw,
  Send,
  UserCheck,
  UserCog,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useUpdateRecruitmentStageMutation } from '@/hooks/domain/recruitment/mutations/useUpdateRecruitmentStageMutation';
import type {
  EndorsementRecord,
  RecruitmentApplication,
  RecruitmentApplicationDetail,
} from '@/lib/domain/recruitment';
import { formatDateTime } from '@/lib/infrastructure';
import { RecruitmentEndorsementInspectSection } from '@/pages/admin/approvals/components/RecruitmentEndorsementInspectSection';

import { EndorsementActionDialog } from './EndorsementActionDialog';

export interface DGroupEndorsementPanelProps {
  application: RecruitmentApplication;
  endorsement?: RecruitmentApplicationDetail['dgroup_endorsement'];
  endorsementHistory?: RecruitmentApplicationDetail['dgroup_endorsement_history'];
}

export function DGroupEndorsementPanel({
  application,
  endorsement,
  endorsementHistory = [],
}: DGroupEndorsementPanelProps) {
  const [isResending, setIsResending] = useState(false);
  const [actionDialogMode, setActionDialogMode] = useState<'change_leader' | 're_request' | null>(
    null,
  );
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const { data: authState, can } = useAdminAuthQuery();
  const updateStageMutation = useUpdateRecruitmentStageMutation();

  const canWrite = can('canWriteAdminData');
  const isAllowedRole =
    authState?.adminRole === 'admin' ||
    authState?.adminRole === 'super_admin' ||
    authState?.adminRole === 'slod' ||
    authState?.adminRole === 'vmt';
  const canManageEndorsement = canWrite && isAllowedRole;

  const isApproved =
    endorsement?.status === 'approved' ||
    Boolean(application.dgroup_approval_id && endorsement?.attestation_answers);
  const isDeclined = endorsement?.status === 'rejected';
  const isDeployed = application.status === 'deployed';
  const isPending = !isApproved && !isDeclined && !isDeployed;
  const canResend = isPending && application.status === 'active';

  const handleResendMagicLink = async () => {
    try {
      setIsResending(true);
      await updateStageMutation.mutateAsync({
        action: 'resend_endorsement',
        application_id: application.id,
      });
      toast.success(
        `A fresh secure endorsement link has been emailed to ${application.dgroup_info.leader_email}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  const hasMultipleAttempts = endorsementHistory.length > 1;

  return (
    <div className="space-y-4">
      {/* Leader & DGroup Overview Card */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary shrink-0" />
            <div>
              <h3 className="font-heading text-base font-bold text-text">
                DGroup & Leader Information
              </h3>
              <p className="text-xs text-muted">
                Applicant’s declared discipleship group and leader contact details.
              </p>
            </div>
          </div>

          <Badge
            variant={isApproved ? 'default' : isDeclined ? 'destructive' : 'secondary'}
            className="gap-1.5"
          >
            {isApproved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Endorsed</span>
              </>
            ) : isDeclined ? (
              <>
                <XCircle className="h-3.5 w-3.5" />
                <span>Endorsement Declined</span>
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5" />
                <span>Pending Leader Review</span>
              </>
            )}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-xs">
          <div>
            <span className="text-muted">Leader Name:</span>
            <p className="font-semibold text-text mt-0.5">{application.dgroup_info.leader_name}</p>
          </div>
          <div>
            <span className="text-muted">Leader Email:</span>
            <p className="font-semibold text-text mt-0.5 flex items-center gap-1.5 truncate">
              <Mail className="h-3.5 w-3.5 text-muted shrink-0" />
              <span className="truncate">{application.dgroup_info.leader_email}</span>
            </p>
          </div>
          <div>
            <span className="text-muted">Leader Contact:</span>
            <p className="font-semibold text-text mt-0.5 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted shrink-0" />
              <span>{application.dgroup_info.leader_phone || 'None provided'}</span>
            </p>
          </div>
          <div>
            <span className="text-muted">Constant DGroup Attendee:</span>
            <p className="font-semibold text-text mt-0.5">
              {application.dgroup_info.is_constant_attendee ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <span className="text-muted">DGroup Member Since:</span>
            <p className="font-semibold text-text mt-0.5">{application.dgroup_info.member_since}</p>
          </div>
          <div>
            <span className="text-muted">Already a DGroup Leader:</span>
            <p className="font-semibold text-text mt-0.5">
              {application.dgroup_info.is_dgroup_leader ? 'Yes' : 'No'}
            </p>
          </div>
          {endorsement?.decided_at && (
            <div>
              <span className="text-muted">Decision Date:</span>
              <p className="font-semibold text-text mt-0.5">
                {formatDateTime(endorsement.decided_at)}
              </p>
            </div>
          )}
        </div>

        {canManageEndorsement && application.status === 'active' && !isDeployed && isApproved && (
          <div className="flex justify-end border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionDialogMode('change_leader')}
              className="gap-1.5 w-full sm:w-auto"
            >
              <UserCog className="h-3.5 w-3.5" />
              <span>Change DGroup Leader</span>
            </Button>
          </div>
        )}
      </div>

      {/* Endorsed State: Render Questionnaire Responses */}
      {isApproved && endorsement?.attestation_answers && (
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-2xs">
          <RecruitmentEndorsementInspectSection
            attestationAnswers={endorsement.attestation_answers}
          />
        </div>
      )}

      {/* Pending State Card */}
      {isPending && (
        <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <h4 className="font-heading text-sm font-bold text-text flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-secondary shrink-0" />
                Awaiting DGroup Leader Endorsement
              </h4>
              <p className="text-xs text-muted max-w-xl">
                A secure endorsement link was automatically sent to{' '}
                <strong>{application.dgroup_info.leader_email}</strong>. Once submitted, their
                character observations and recommendation will appear here.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {canManageEndorsement && application.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionDialogMode('change_leader')}
                  className="gap-1.5 shrink-0"
                >
                  <UserCog className="h-3.5 w-3.5" />
                  <span>Change DGroup Leader</span>
                </Button>
              )}

              {canResend && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendMagicLink}
                  disabled={isResending}
                  className="gap-1.5 shrink-0"
                >
                  {isResending ? (
                    <>
                      <Spinner size="sm" />
                      <span>Resending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Resend Endorsement Link</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Declined State Card */}
      {isDeclined && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="font-heading text-sm font-bold text-danger flex items-center gap-1.5">
                <XCircle className="h-4 w-4 shrink-0" />
                Endorsement Declined by Leader
              </h4>
              <p className="text-xs text-text mt-1">
                The DGroup Leader indicated they cannot endorse this applicant at this time.
              </p>
            </div>

            {canManageEndorsement && application.status === 'active' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setActionDialogMode('re_request')}
                className="gap-1.5 shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Request Endorsement Again</span>
              </Button>
            )}
          </div>

          {endorsement?.decision_notes && (
            <div className="rounded-xl border border-border bg-background p-3 text-xs">
              <span className="font-semibold text-text">Leader Notes:</span>
              <p className="mt-1 text-muted whitespace-pre-wrap">{endorsement.decision_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Endorsement History Section (Visible when > 1 attempt exists) */}
      {hasMultipleAttempts && (
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-2xs space-y-3">
          <button
            type="button"
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="flex w-full items-center justify-between text-left focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted shrink-0" />
              <h4 className="font-heading text-sm font-bold text-text">
                Endorsement History ({endorsementHistory.length} attempts)
              </h4>
            </div>
            {isHistoryExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted shrink-0" />
            )}
          </button>

          {isHistoryExpanded && (
            <div className="space-y-3 pt-2 border-t border-border">
              {endorsementHistory.map((item: EndorsementRecord, idx: number) => {
                const attemptNumber = endorsementHistory.length - idx;
                const isItemApproved = item.status === 'approved';
                const isItemDeclined = item.status === 'rejected';
                const isItemCancelled = item.status === 'cancelled';

                return (
                  <div
                    key={item.approval_id}
                    className="rounded-xl border border-border bg-background p-3 text-xs space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text">Attempt #{attemptNumber}</span>
                        {item.assigned_to_email && (
                          <span className="text-muted">({item.assigned_to_email})</span>
                        )}
                      </div>
                      <Badge
                        variant={
                          isItemApproved
                            ? 'default'
                            : isItemDeclined
                              ? 'destructive'
                              : isItemCancelled
                                ? 'outline'
                                : 'secondary'
                        }
                      >
                        {isItemApproved
                          ? 'Endorsed'
                          : isItemDeclined
                            ? 'Declined'
                            : isItemCancelled
                              ? 'Cancelled / Superseded'
                              : 'Pending Review'}
                      </Badge>
                    </div>

                    <div className="grid gap-1 sm:grid-cols-2 text-muted">
                      {item.created_at && (
                        <div>
                          <span>Requested: </span>
                          <span className="text-text font-medium">
                            {formatDateTime(item.created_at)}
                          </span>
                        </div>
                      )}
                      {item.decided_at && (
                        <div>
                          <span>Decided: </span>
                          <span className="text-text font-medium">
                            {formatDateTime(item.decided_at)}
                          </span>
                        </div>
                      )}
                    </div>

                    {item.decision_notes && (
                      <div className="rounded-lg bg-surface p-2 text-muted border border-border mt-1">
                        <span className="font-semibold text-text">Notes: </span>
                        <span className="whitespace-pre-wrap">{item.decision_notes}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Action Dialog for Change Leader or Re-Request */}
      {actionDialogMode && (
        <EndorsementActionDialog
          isOpen={Boolean(actionDialogMode)}
          onClose={() => setActionDialogMode(null)}
          applicationId={application.id}
          applicantName={application.full_name}
          mode={actionDialogMode}
          initialLeaderName={application.dgroup_info.leader_name}
          initialLeaderEmail={application.dgroup_info.leader_email}
          initialLeaderPhone={application.dgroup_info.leader_phone}
          isEndorsed={isApproved}
        />
      )}
    </div>
  );
}
