import { useEffect, useState } from 'react';

import { useRouteError } from 'react-router-dom';

import { logger } from '@/lib/infrastructure';

/**
 * Route-level error boundary to catch errors in React Router (e.g., rendering errors, missing routes).
 * Displays a styled error screen instead of the default React Router error page.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const [requestId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    // Log the error when it occurs
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('React Router caught exception', {
      requestId,
      error: errorMessage,
      stack: errorStack,
    });
  }, [error, requestId]);

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-surface p-6 shadow-md">
        <h1 className="text-xl font-semibold text-text">Something went wrong</h1>
        <p className="text-sm text-muted">
          An unexpected error occurred. Please try refreshing the page, or contact support if the
          problem persists.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Refresh Page
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="flex-1 rounded border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-muted"
          >
            Go Home
          </button>
        </div>
        <details className="mt-4 text-xs text-muted">
          <summary className="cursor-pointer font-medium hover:text-text">Error details</summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs text-white">
            {`Request ID: ${requestId}\n\n${errorMessage}\n\n${errorStack || 'No stack trace'}`}
          </pre>
        </details>
      </div>
    </div>
  );
}
