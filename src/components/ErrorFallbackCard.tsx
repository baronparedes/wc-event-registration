interface ErrorFallbackCardProps {
  requestId: string;
  errorMessage: string;
  errorStack?: string;
}

/**
 * Presentational error fallback screen displayed when a runtime or route error occurs.
 */
export function ErrorFallbackCard({ requestId, errorMessage, errorStack }: ErrorFallbackCardProps) {
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
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Refresh Page
          </button>
          <button
            type="button"
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
