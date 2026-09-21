import type { ReactNode } from 'react';
import { Component } from 'react';

import { logger } from '@/lib/infrastructure';

import { ErrorFallbackCard } from './ErrorFallbackCard';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  requestId: string;
}

/**
 * Global error boundary to catch rendering crashes and prevent blank screen.
 * Logs errors with request correlation ID for debugging.
 *
 * NOTE: Must be a class component. Error boundaries require `getDerivedStateFromError()`
 * and `componentDidCatch()` lifecycle methods, which are only available in class components.
 * React does not provide hook equivalents for error boundaries. This is the only supported way.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      requestId: crypto.randomUUID(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React ErrorBoundary caught exception', {
      requestId: this.state.requestId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackCard
          requestId={this.state.requestId}
          errorMessage={this.state.error?.message ?? 'An unexpected error occurred.'}
          errorStack={this.state.error?.stack}
        />
      );
    }

    return this.props.children;
  }
}
