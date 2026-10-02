import { Calendar, FileText, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ROUTE_PATHS } from '@/config/constants';

export function CommunityWelcome() {
  return (
    <section aria-labelledby="community-welcome-title" className="space-y-7">
      <div className="max-w-2xl space-y-3 border-l-4 border-accent pl-5">
        <h1
          id="community-welcome-title"
          className="font-heading text-3xl font-bold leading-tight text-text sm:text-4xl"
        >
          A community serving together.
        </h1>
        <p className="max-w-xl text-base text-muted">
          Thank you for being part of our volunteer community. Together, we joyfully welcome,
          connect, and serve.
        </p>
      </div>
      <div className="grid gap-6 border-t border-border pt-6 md:grid-cols-3 md:gap-8">
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text">
            <Calendar aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            Events
          </h2>
          <p className="text-sm text-muted">Join community gatherings and volunteer activities.</p>
        </div>
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text">
            <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-secondary" />
            Forms
          </h2>
          <p className="text-sm text-muted">Share feedback and submit community requests.</p>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text">
              <UserRound aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
              Your member profile
            </h2>
            <Link
              to={ROUTE_PATHS.profile}
              className="shrink-0 rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Sign In &rarr;
            </Link>
          </div>
          <p className="text-sm text-muted">
            Sign in to see your profile, commitments, attendance, and events joined.
          </p>
        </div>
      </div>
    </section>
  );
}
