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

export function Step1SurveyReviewPanel({ application, endorsement }: Step1SurveyReviewPanelProps) {
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
          {endorsement?.status === 'approved' ? (
            <Badge variant="default">Endorsed</Badge>
          ) : endorsement?.status === 'rejected' ? (
            <Badge variant="destructive">Declined by Leader</Badge>
          ) : (
            <Badge variant="secondary">Pending Leader Endorsement</Badge>
          )}
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
