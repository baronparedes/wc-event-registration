import { ArrowRight, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ROUTE_PATHS } from '@/config/constants';
import { useAdminAuthQuery, useAuthSessionQuery } from '@/hooks/domain/auth';
import {
  useMyRecruitmentApplicationQuery,
  usePublicRecruitmentConfigQuery,
} from '@/hooks/domain/recruitment';

export function RecruitmentHubBanner() {
  const { data: session, isLoading: isSessionLoading } = useAuthSessionQuery();
  const userId = session?.user.id;
  const { data: config, isLoading: isConfigLoading } = usePublicRecruitmentConfigQuery();
  const { data: application, isLoading: isApplicationLoading } = useMyRecruitmentApplicationQuery(
    userId,
    Boolean(userId),
  );
  const isRecruitmentOpen = config?.is_recruitment_open === true;
  const hasActiveApplication =
    application?.status === 'active' || application?.status === 'on_hold';
  const shouldCheckAdminRole = Boolean(userId && !hasActiveApplication);
  const { data: adminAuth, isLoading: isAdminAuthLoading } =
    useAdminAuthQuery(shouldCheckAdminRole);
  const isRecruitmentStaff = ['admin', 'super_admin', 'kiosk', 'vmt'].includes(
    adminAuth?.adminRole ?? '',
  );

  if (isSessionLoading || isConfigLoading || (userId && isApplicationLoading)) return null;
  if (shouldCheckAdminRole && isAdminAuthLoading) return null;
  if (!hasActiveApplication && !isRecruitmentStaff) return null;

  const progress = hasActiveApplication ? Math.round((application.current_step / 9) * 100) : null;

  return (
    <section
      aria-label="Welcome Center team"
      className="flex flex-col gap-4 border-l-4 border-primary bg-surface px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-7"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-text">
          <ClipboardList aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-text">
            {hasActiveApplication
              ? `Your Application: Step ${application.current_step} of 9`
              : isRecruitmentOpen
                ? 'Join the Welcome Center Team'
                : 'Welcome Center Team'}
          </h2>
          {hasActiveApplication ? (
            <div
              aria-label={`Application progress: ${progress}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress ?? 0}
              className="mt-2 h-2 max-w-sm overflow-hidden rounded-full bg-background"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">
              {isRecruitmentOpen
                ? 'Applications are open to join the Welcome Center team.'
                : 'Applications are currently closed.'}
            </p>
          )}
        </div>
      </div>
      <Link
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        to={hasActiveApplication ? ROUTE_PATHS.recruitment : ROUTE_PATHS.recruitmentApply}
      >
        {hasActiveApplication ? 'View Status' : isRecruitmentOpen ? 'Join Now' : 'View Application'}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}
