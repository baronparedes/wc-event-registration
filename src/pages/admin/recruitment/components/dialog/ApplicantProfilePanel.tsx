import { useState } from 'react';

import { Pencil, RefreshCw, ShieldCheck, User, UserCog } from 'lucide-react';
import { toast } from 'sonner';

import { Badge, Button, ConfirmDialog, Spinner } from '@/components/ui';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useUpdateRecruitmentStageMutation } from '@/hooks/domain/recruitment';
import type {
  RecruitmentApplication,
  RecruitmentApplicationDetail,
} from '@/lib/domain/recruitment';
import { calculateAge } from '@/pages/recruitment/apply/utils';

import { EditApplicantDetailsDialog } from './EditApplicantDetailsDialog';
import { EditableApplicantAvatar } from './EditableApplicantAvatar';
import { EndorsementActionDialog } from './EndorsementActionDialog';

interface ApplicantProfilePanelProps {
  application: RecruitmentApplication;
  endorsement?: RecruitmentApplicationDetail['dgroup_endorsement'];
}

export function ApplicantProfilePanel({ application, endorsement }: ApplicantProfilePanelProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [actionDialogMode, setActionDialogMode] = useState<'change_leader' | 're_request' | null>(
    null,
  );
  const { data: authState, can } = useAdminAuthQuery();
  const updateStageMutation = useUpdateRecruitmentStageMutation();
  const age = calculateAge(application.date_of_birth);

  const canWrite = can('canWriteAdminData');
  const isAllowedRole =
    authState?.adminRole === 'admin' ||
    authState?.adminRole === 'super_admin' ||
    authState?.adminRole === 'slod' ||
    authState?.adminRole === 'vmt';
  const canManageEndorsement = canWrite && isAllowedRole;

  const isEndorsed =
    endorsement?.status === 'approved' ||
    Boolean(application.dgroup_approval_id && endorsement?.attestation_answers);
  const isDeclined = endorsement?.status === 'rejected';
  const isDeployed = application.status === 'deployed';
  const canResend = !isEndorsed && !isDeclined && !isDeployed && application.status === 'active';

  const handleResendEndorsement = () => {
    updateStageMutation.mutate(
      {
        action: 'resend_endorsement',
        application_id: application.id,
      },
      {
        onSuccess: () => {
          setIsConfirmOpen(false);
          toast.success(
            `Resent endorsement magic-link email to ${application.dgroup_info.leader_email}`,
          );
        },
        onError: (err) => {
          setIsConfirmOpen(false);
          toast.error(err.message || 'Failed to resend endorsement email');
        },
      },
    );
  };

  return (
    <div className="space-y-5 pr-1 text-xs">
      {/* Identity Header */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
        <EditableApplicantAvatar
          applicationId={application.id}
          name={application.full_name}
          avatarObjectKey={application.avatar_object_key}
        />
        <div className="min-w-0">
          <h3 className="truncate font-heading text-base font-bold text-text">
            {application.full_name} {application.nickname ? `(${application.nickname})` : ''}
          </h3>
          <p className="text-muted">{application.email}</p>
          <p className="text-muted">{application.phone}</p>
        </div>
        {canWrite && !isDeployed && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-1.5 ml-auto shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit Details</span>
          </Button>
        )}
      </div>

      {/* Demographics & Personal Details */}
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-1.5 border-b border-border pb-2">
          <User className="h-4 w-4 text-muted" />
          <h4 className="font-heading text-sm font-bold text-text">Demographics & Work</h4>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <span className="text-muted">Date of Birth:</span>
            <p className="font-semibold text-text">
              {application.date_of_birth} ({age ?? '—'} yrs old)
            </p>
          </div>
          <div>
            <span className="text-muted">Gender:</span>
            <p className="font-semibold text-text">{application.gender}</p>
          </div>
          <div>
            <span className="text-muted">Life Stage:</span>
            <p className="font-semibold text-text">{application.life_stage}</p>
          </div>
          {application.personal_details.wedding_anniversary && (
            <div>
              <span className="text-muted">Wedding Anniversary:</span>
              <p className="font-semibold text-text">
                {application.personal_details.wedding_anniversary}
              </p>
            </div>
          )}
          <div>
            <span className="text-muted">Occupation:</span>
            <p className="font-semibold text-text">{application.personal_details.occupation}</p>
          </div>
          {application.personal_details.company_name && (
            <div>
              <span className="text-muted">Company:</span>
              <p className="font-semibold text-text">{application.personal_details.company_name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h4 className="font-heading text-sm font-bold text-text border-b border-border pb-2">
          Emergency Contact
        </h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <span className="text-muted">Contact Name:</span>
            <p className="font-semibold text-text">{application.emergency_contact.name}</p>
          </div>
          <div>
            <span className="text-muted">Mobile Number:</span>
            <p className="font-semibold text-text">{application.emergency_contact.phone}</p>
          </div>
          <div>
            <span className="text-muted">Relationship:</span>
            <p className="font-semibold text-text">{application.emergency_contact.relation}</p>
          </div>
        </div>
      </div>

      {/* Spiritual Background & GLC */}
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-1.5 border-b border-border pb-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h4 className="font-heading text-sm font-bold text-text">Spiritual Background & GLC</h4>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <span className="text-muted">CCF Member Since:</span>
            <p className="font-semibold text-text">
              {application.spiritual_background.ccf_member_since}
            </p>
          </div>
          <div>
            <span className="text-muted">GLC 1 Status:</span>
            <p className="font-semibold text-text">
              {application.spiritual_background.glc1_status}
            </p>
          </div>
          <div>
            <span className="text-muted">GLC 2 Status:</span>
            <p className="font-semibold text-text">
              {application.spiritual_background.glc2_status}
            </p>
          </div>
          {application.spiritual_background.other_ministries && (
            <div className="sm:col-span-3">
              <span className="text-muted">Other Ministries:</span>
              <p className="font-semibold text-text">
                {application.spiritual_background.other_ministries}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DGroup Information & Attestation Magic Link */}
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <h4 className="font-heading text-sm font-bold text-text">DGroup & Leader Attestation</h4>
          <Badge variant={isEndorsed ? 'default' : isDeclined ? 'destructive' : 'secondary'}>
            {isEndorsed
              ? 'Endorsed'
              : isDeclined
                ? 'Endorsement Declined'
                : 'Pending Leader Review'}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <span className="text-muted">Constant Attendee:</span>
            <p className="font-semibold text-text">
              {application.dgroup_info.is_constant_attendee ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <span className="text-muted">DGroup Member Since:</span>
            <p className="font-semibold text-text">{application.dgroup_info.member_since}</p>
          </div>
          <div>
            <span className="text-muted">Is DGroup Leader:</span>
            <p className="font-semibold text-text">
              {application.dgroup_info.is_dgroup_leader ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <span className="text-muted">Leader Name:</span>
            <p className="font-semibold text-text">{application.dgroup_info.leader_name}</p>
          </div>
          <div>
            <span className="text-muted">Leader Email:</span>
            <p className="font-semibold text-text">{application.dgroup_info.leader_email}</p>
          </div>
          <div>
            <span className="text-muted">Leader Mobile:</span>
            <p className="font-semibold text-text">{application.dgroup_info.leader_phone}</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {canManageEndorsement && canResend && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setActionDialogMode('change_leader')}
              disabled={updateStageMutation.isPending}
            >
              <UserCog className="mr-1.5 h-3.5 w-3.5" />
              Change Leader
            </Button>
          )}

          {canResend && (
            <Button
              type="button"
              variant="primaryOutline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setIsConfirmOpen(true)}
              disabled={updateStageMutation.isPending}
            >
              {updateStageMutation.isPending ? (
                <Spinner size="sm" className="mr-1.5" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Resend Endorsement Email
            </Button>
          )}

          {canManageEndorsement && isDeclined && application.status === 'active' && (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setActionDialogMode('re_request')}
              disabled={updateStageMutation.isPending}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Request Endorsement Again
            </Button>
          )}
        </div>
      </div>

      {canResend && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          title="Resend Endorsement Email"
          description={
            <>
              Are you sure you want to resend the endorsement email to{' '}
              <strong className="text-text">{application.dgroup_info.leader_name}</strong> at{' '}
              <strong className="text-text">{application.dgroup_info.leader_email}</strong>? This
              will dispatch a fresh magic link to their inbox.
            </>
          }
          confirmLabel="Resend Email"
          confirmLoadingLabel="Resending..."
          confirmVariant="default"
          isPending={updateStageMutation.isPending}
          onConfirm={handleResendEndorsement}
          onCancel={() => setIsConfirmOpen(false)}
        />
      )}

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
        />
      )}

      {isEditDialogOpen && (
        <EditApplicantDetailsDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          application={application}
        />
      )}
    </div>
  );
}
