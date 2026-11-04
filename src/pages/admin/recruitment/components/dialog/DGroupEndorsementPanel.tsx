import { useState } from 'react';

import { CheckCircle2, Clock, Mail, Phone, Send, UserCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useUpdateRecruitmentStageMutation } from '@/hooks/domain/recruitment/mutations/useUpdateRecruitmentStageMutation';
import type {
  RecruitmentApplication,
  RecruitmentApplicationDetail,
} from '@/lib/domain/recruitment';
import { formatDateTime } from '@/lib/infrastructure';
import { RecruitmentEndorsementInspectSection } from '@/pages/admin/approvals/components/RecruitmentEndorsementInspectSection';

export interface DGroupEndorsementPanelProps {
  application: RecruitmentApplication;
  endorsement?: RecruitmentApplicationDetail['dgroup_endorsement'];
}

export function DGroupEndorsementPanel({ application, endorsement }: DGroupEndorsementPanelProps) {
  const [isResending, setIsResending] = useState(false);
  const updateStageMutation = useUpdateRecruitmentStageMutation();

  const isApproved =
    endorsement?.status === 'approved' ||
    Boolean(application.dgroup_approval_id && endorsement?.attestation_answers);
  const isDeclined = endorsement?.status === 'rejected';
  const isPending = !isApproved && !isDeclined;

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
                <span>Endorsed & Linked</span>
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
                  <span>Resend Endorsment Link</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Declined State Card */}
      {isDeclined && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:p-5 shadow-2xs space-y-2">
          <h4 className="font-heading text-sm font-bold text-danger flex items-center gap-1.5">
            <XCircle className="h-4 w-4 shrink-0" />
            Endorsement Declined by Leader
          </h4>
          <p className="text-xs text-text">
            The DGroup Leader indicated they cannot endorse this applicant at this time.
          </p>
          {endorsement?.decision_notes && (
            <div className="mt-2 rounded-xl border border-border bg-background p-3 text-xs">
              <span className="font-semibold text-text">Leader Notes:</span>
              <p className="mt-1 text-muted whitespace-pre-wrap">{endorsement.decision_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
