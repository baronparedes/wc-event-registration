import { Badge } from '@/components/ui';
import type {
  RecruitmentApplication,
  RecruitmentApplicationDetail,
} from '@/lib/domain/recruitment';
import { formatDateTime } from '@/lib/infrastructure';

import { BiblicalSurveyReviewPanel } from '../BiblicalSurveyReviewPanel';

interface Step1SurveyReviewPanelProps {
  application: RecruitmentApplication;
  endorsement?: RecruitmentApplicationDetail['dgroup_endorsement'];
}

const getEndorsementStatusBadge = (isEndorsed: boolean, isDeclined: boolean) => {
  if (isEndorsed) return { variant: 'default' as const, label: 'Endorsed' };
  if (isDeclined) return { variant: 'destructive' as const, label: 'Declined by Leader' };
  return { variant: 'secondary' as const, label: 'Pending Leader Endorsement' };
};

export function Step1SurveyReviewPanel({ application, endorsement }: Step1SurveyReviewPanelProps) {
  const isEndorsed =
    endorsement?.status === 'approved' ||
    Boolean(application.dgroup_approval_id && endorsement?.attestation_answers);
  const isDeclined = endorsement?.status === 'rejected';

  return (
    <div className="space-y-4">
      <div className="space-y-2.5 text-xs text-text py-1">
        <p>
          <strong>Application Submitted:</strong> {formatDateTime(application.created_at)}
        </p>
        <p>
          <strong>DGroup Leader:</strong> {application.dgroup_info.leader_name} (
          {application.dgroup_info.leader_email})
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <strong>DGroup Endorsement Status:</strong>
          {(() => {
            const badge = getEndorsementStatusBadge(isEndorsed, isDeclined);
            return <Badge variant={badge.variant}>{badge.label}</Badge>;
          })()}
        </div>
      </div>

      {/* Biblical Survey Results */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-text">
            Biblical Survey Results
          </h4>
        </div>
        <BiblicalSurveyReviewPanel application={application} />
      </div>
    </div>
  );
}
