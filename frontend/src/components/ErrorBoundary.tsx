import React from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ✅ Error Boundary Component
 * Catches component rendering errors and prevents app crash
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('🔴 ErrorBoundary caught error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Update internal state
    this.setState((prevState) => ({
      ...prevState,
      errorInfo,
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send to error tracking service (optional)
    this.reportErrorToService(error, errorInfo);
  }

  private reportErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Example: Send to Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }

    // Or send to your own error tracking API
    // await fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     message: error.message,
    //     stack: error.stack,
    //     componentStack: errorInfo.componentStack,
    //     timestamp: new Date().toISOString(),
    //   }),
    // });
  }

  private handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // ✅ Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // ✅ Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Oops! Something went wrong
            </h1>

            {/* Error Message */}
            <p className="text-gray-600 text-center mb-4">
              We encountered an unexpected error. Our team has been notified.
            </p>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-4 p-3 bg-gray-100 rounded text-sm">
                <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                  Error Details
                </summary>
                <div className="space-y-2 font-mono text-xs text-red-700 overflow-auto max-h-40">
                  <p>
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <p>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap break-words">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </p>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleDismiss}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Dismiss
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Reload
              </button>
              <a
                href="/"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
              >
                Go Home
              </a>
            </div>

            {/* Support Info */}
            <p className="text-xs text-gray-500 text-center mt-4">
              If the problem persists, please contact{' '}
              <a href="mailto:support@deepskyn.com" className="underline hover:text-gray-700">
                support@deepskyn.com
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version for functional components
 * Usage: useErrorHandler(error)
 */
export function useErrorHandler(error: Error | null) {
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
}

export default ErrorBoundary;
