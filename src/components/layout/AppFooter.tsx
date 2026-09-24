import { Link } from 'react-router-dom';

import { LEGAL_CONFIG, ROUTE_PATHS } from '@/config/constants';
import { env } from '@/config/env';

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/50 py-6 text-xs text-muted print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <p>
            &copy; {new Date().getFullYear()} {LEGAL_CONFIG.organizationName}. All rights reserved.
          </p>
          {(env.appVersion || env.appCommitHash) && (
            <p className="text-muted/50">
              {env.appVersion && `v${env.appVersion}`}
              {env.appVersion && env.appCommitHash && ' '}
              {env.appCommitHash && `(${env.appCommitHash})`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 font-medium">
          <Link
            to={ROUTE_PATHS.privacy}
            className="text-muted transition hover:text-text hover:underline"
          >
            Privacy Policy
          </Link>
          <span aria-hidden="true" className="text-border">
            •
          </span>
          <Link
            to={ROUTE_PATHS.terms}
            className="text-muted transition hover:text-text hover:underline"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
