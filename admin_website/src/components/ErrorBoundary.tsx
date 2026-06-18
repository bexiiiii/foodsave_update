"use client";

import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so next render shows fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console (in production, you'd send to error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Prevent infinite error loop
    if (typeof window !== 'undefined') {
      // If error keeps happening, clear localStorage and force reload
      const errorCount = parseInt(sessionStorage.getItem('errorCount') || '0', 10);
      if (errorCount > 3) {
        console.error('Too many errors, clearing storage and reloading...');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/signin';
      } else {
        sessionStorage.setItem('errorCount', String(errorCount + 1));
      }
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-red-100 dark:bg-red-900">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We're sorry for the inconvenience. The application encountered an unexpected error.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
                  <p className="text-sm font-mono text-red-800 dark:text-red-300 break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.resetErrorBoundary}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/signin'}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
