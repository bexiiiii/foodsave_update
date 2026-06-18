"use client";

import { useEffect } from 'react';

/**
 * Global error handler to catch unhandled errors and prevent crash loops
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      event.preventDefault(); // Prevent default browser error handling
      
      // Track error count to prevent infinite loops
      const errorCount = parseInt(sessionStorage.getItem('rejectionCount') || '0', 10);
      if (errorCount > 5) {
        console.error('Too many unhandled rejections, clearing storage...');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/signin';
      } else {
        sessionStorage.setItem('rejectionCount', String(errorCount + 1));
      }
    };

    // Handle general errors
    const handleError = (event: ErrorEvent) => {
      console.error('Unhandled Error:', event.error || event.message);
      event.preventDefault(); // Prevent default browser error handling
      
      // Track error count to prevent infinite loops
      const errorCount = parseInt(sessionStorage.getItem('globalErrorCount') || '0', 10);
      if (errorCount > 5) {
        console.error('Too many global errors, clearing storage...');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/signin';
      } else {
        sessionStorage.setItem('globalErrorCount', String(errorCount + 1));
      }
    };

    // Attach event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Reset error counts after 60 seconds of no errors
    const resetTimer = setTimeout(() => {
      sessionStorage.removeItem('rejectionCount');
      sessionStorage.removeItem('globalErrorCount');
      sessionStorage.removeItem('errorCount');
    }, 60000);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      clearTimeout(resetTimer);
    };
  }, []);

  return null; // This component doesn't render anything
}
