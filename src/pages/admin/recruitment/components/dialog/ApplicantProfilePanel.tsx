import { RefreshCw, ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, Badge, Button, Spinner } from '@/components/ui';
import { useUpdateRecruitmentStageMutation } from '@/hooks/domain/recruitment';
import type { RecruitmentApplication } from '@/lib/domain/recruitment';
import { calculateAge } from '@/pages/recruitment/apply/utils';

interface ApplicantProfilePanelProps {
  application: RecruitmentApplication;
}

export function ApplicantProfilePanel({ application }: ApplicantProfilePanelProps) {
  const updateStageMutation = useUpdateRecruitmentStageMutation();
  const age = calculateAge(application.date_of_birth);

  const handleResendEndorsement = () => {
    updateStageMutation.mutate(
      {
        action: 'resend_endorsement',
        application_id: application.id,
      },
      {
        onSuccess: () => {
          toast.success(
            `Resent endorsement magic-link email to ${application.dgroup_info.leader_email}`,
          );
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to resend endorsement email');
        },
      },
    );
  };

  return (
    <div className="max-h-[calc(75vh-10rem)] space-y-5 overflow-y-auto pr-1 text-xs">
      {/* Identity Header */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
        <Avatar
          name={application.full_name}
          avatarObjectKey={application.avatar_object_key}
          size="lg"
        />
        <div className="min-w-0">
          <h3 className="truncate font-heading text-base font-bold text-text">
            {application.full_name} {application.nickname ? `(${application.nickname})` : ''}
          </h3>
          <p className="text-muted">{application.email}</p>
          <p className="text-muted">{application.phone}</p>
        </div>
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
          <Badge variant={application.dgroup_approval_id ? 'default' : 'secondary'}>
            {application.dgroup_approval_id ? 'Endorsed & Linked' : 'Pending Leader Review'}
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

        <div className="pt-2">
          <Button
            type="button"
            variant="primaryOutline"
            size="sm"
            onClick={handleResendEndorsement}
            disabled={updateStageMutation.isPending}
          >
            {updateStageMutation.isPending ? (
              <Spinner size="sm" className="mr-1.5" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Resend Endorsement Magic-Link Email
          </Button>
        </div>
      </div>
    </div>
  );
}
