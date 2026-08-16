import type { ReactNode } from 'react';
import { Component } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { ROUTE_PATHS } from '@/config/constants';
import { logger } from '@/lib/infrastructure';

interface Props {
  children: ReactNode;
}

interface BoundaryProps extends Props {
  navigate: NavigateFunction;
  resetKey: string;
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
class ErrorBoundaryClass extends Component<BoundaryProps, State> {
  constructor(props: BoundaryProps) {
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

  componentDidUpdate(previousProps: BoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  reset() {
    this.setState({
      hasError: false,
      error: null,
      requestId: crypto.randomUUID(),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="mx-auto flex max-w-md flex-col items-center justify-center space-y-4 text-center p-6">
          <div className="text-6xl font-bold text-text">!</div>
          <h1 className="text-2xl font-semibold text-text">Something went wrong</h1>
          <p className="text-sm text-muted">
            An unexpected error occurred. Please try refreshing the page, or contact support if the
            problem persists.
          </p>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => this.reset()} variant="primaryOutline">
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="default">
              Refresh Page
            </Button>
            <Button onClick={() => this.props.navigate(ROUTE_PATHS.home)} variant="primaryOutline">
              Go Home
            </Button>
          </div>
          {this.state.error && (
            <details className="w-full text-left text-xs text-muted">
              <summary className="cursor-pointer text-center font-medium hover:text-text">
                Error details
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs text-white">
                {`Request ID: ${this.state.requestId}\n\n${this.state.error.message}\n\n${this.state.error.stack || 'No stack trace'}`}
              </pre>
            </details>
          )}
        </section>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <ErrorBoundaryClass navigate={navigate} resetKey={location.key}>
      {children}
    </ErrorBoundaryClass>
  );
}
