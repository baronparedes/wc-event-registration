import type { ReactNode } from 'react'
import { Component } from 'react'
import { logger } from '@/lib/infrastructure'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  requestId: string
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
    super(props)
    this.state = {
      hasError: false,
      error: null,
      requestId: crypto.randomUUID(),
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React ErrorBoundary caught exception', {
      requestId: this.state.requestId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-surface p-6 shadow-md">
            <h1 className="text-xl font-semibold text-text">Something went wrong</h1>
            <p className="text-sm text-muted">
              An unexpected error occurred. Please try refreshing the page, or contact support if
              the problem persists.
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
            {this.state.error && (
              <details className="mt-4 text-xs text-muted">
                <summary className="cursor-pointer font-medium hover:text-text">
                  Error details
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs text-white">
                  {`Request ID: ${this.state.requestId}\n\n${this.state.error.message}\n\n${this.state.error.stack || 'No stack trace'}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
