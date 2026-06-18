'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Don't trigger error boundary for certain types of errors
    const ignoredErrors = [
      'WebSocket',
      'telegram',
      'MTProto',
      'Connection closed',
      'Failed to fetch',
      'Cannot read properties of undefined',
      'length',
      'Network request failed',
      'Loading chunk'
    ];
    
    const shouldIgnore = ignoredErrors.some(ignoredError => 
      error.message?.toLowerCase().includes(ignoredError.toLowerCase()) ||
      error.name?.toLowerCase().includes(ignoredError.toLowerCase()) ||
      error.stack?.toLowerCase().includes(ignoredError.toLowerCase())
    );
    
    if (shouldIgnore) {
      console.warn('Ignoring error in ErrorBoundary:', error.message);
      return { hasError: false };
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Don't log certain types of errors
    const ignoredErrors = [
      'WebSocket',
      'telegram',
      'MTProto', 
      'Connection closed',
      'Failed to fetch'
    ];
    
    const shouldIgnore = ignoredErrors.some(ignoredError => 
      error.message?.toLowerCase().includes(ignoredError.toLowerCase()) ||
      error.name?.toLowerCase().includes(ignoredError.toLowerCase())
    );
    
    if (!shouldIgnore) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          retry={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="min-h-screen bg-white flex items-center justify-center px-4">
    <div className="text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Что-то пошло не так</h2>
      <p className="text-gray-600 mb-6">
        Произошла ошибка при загрузке приложения. Пожалуйста, попробуйте еще раз.
      </p>
      {process.env.NODE_ENV === 'development' && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
          <p className="text-red-800 text-sm font-mono">{error.message}</p>
        </div>
      )}
      <button
        onClick={retry}
        className="bg-[#73be61] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#68a356] transition-colors"
      >
        Попробовать снова
      </button>
    </div>
  </div>
);

// Hook для безопасного выполнения асинхронных операций
export const useErrorHandler = () => {
  const handleError = (error: unknown, context?: string) => {
    console.error(`Error ${context ? `in ${context}` : ''}:`, error);
    
    // В продакшене можно отправлять ошибки в систему мониторинга
    if (process.env.NODE_ENV === 'production') {
      // Например, отправка в Sentry или другую систему мониторинга
      // sentryClient.captureException(error);
    }
  };

  return { handleError };
};