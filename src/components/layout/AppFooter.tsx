import { Link } from 'react-router-dom';

import { LEGAL_CONFIG, ROUTE_PATHS } from '@/config/constants';

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/50 py-6 text-xs text-muted print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <p>
          &copy; {new Date().getFullYear()} {LEGAL_CONFIG.organizationName}. All rights reserved.
        </p>
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
