import { useEffect, useState } from 'react';

import { useRouteError } from 'react-router-dom';

import { logger } from '@/lib/infrastructure';

import { ErrorFallbackCard } from './ErrorFallbackCard';

/**
 * Route-level error boundary to catch errors in React Router (e.g., rendering errors, missing routes).
 * Displays a styled error screen instead of the default React Router error page.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const [requestId] = useState(() => crypto.randomUUID());

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  useEffect(() => {
    logger.error('React Router caught exception', {
      requestId,
      error: errorMessage,
      stack: errorStack,
    });
  }, [error, errorMessage, errorStack, requestId]);

  return (
    <ErrorFallbackCard requestId={requestId} errorMessage={errorMessage} errorStack={errorStack} />
  );
}
