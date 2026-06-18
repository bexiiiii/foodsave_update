import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility functions for safe data handling and error prevention

// Safe image loading with fallback
export const loadImageSafely = (
  imageUrl: string | undefined | null,
  fallbackUrl = '/placeholder-food.jpg'
): Promise<string> => {
  return new Promise((resolve) => {
    if (!imageUrl || imageUrl.trim() === '') {
      resolve(fallbackUrl);
      return;
    }

    const img = new Image();
    img.onload = () => resolve(imageUrl);
    img.onerror = () => {
      console.warn(`Failed to load image: ${imageUrl}, using fallback`);
      resolve(fallbackUrl);
    };
    img.src = imageUrl;
  });
};

// Safe data access helpers
export const safeGet = <T>(
  obj: Record<string, unknown> | null | undefined,
  path: string,
  defaultValue: T
): T => {
  try {
    const keys = path.split('.');
    let result: unknown = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = (result as Record<string, unknown>)[key];
    }
    
    return result !== undefined ? (result as T) : defaultValue;
  } catch (error) {
    console.warn(`Failed to access path "${path}":`, error);
    return defaultValue;
  }
};

// Safe array mapping
export const safeMap = <T, R>(
  array: T[] | undefined | null,
  mapper: (item: T, index: number) => R
): R[] => {
  if (!Array.isArray(array)) {
    console.warn('Expected array but got:', typeof array);
    return [];
  }
  
  try {
    return array.map(mapper);
  } catch (error) {
    console.error('Error during array mapping:', error);
    return [];
  }
};

// Safe number parsing
export const safeParseNumber = (
  value: unknown,
  defaultValue = 0
): number => {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  return defaultValue;
};

// Safe string handling
export const safeString = (
  value: unknown,
  defaultValue = ''
): string => {
  if (typeof value === 'string') {
    return value;
  }
  
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  try {
    return String(value);
  } catch (error) {
    console.warn('Failed to convert to string:', error);
    return defaultValue;
  }
};

// Debounce function to prevent rapid API calls
export const debounce = <T extends unknown[]>(
  func: (...args: T) => void | Promise<void>,
  wait: number
): ((...args: T) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: T) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function to limit API call frequency
export const throttle = <T extends unknown[]>(
  func: (...args: T) => void | Promise<void>,
  limit: number
): ((...args: T) => void) => {
  let inThrottle: boolean;
  
  return (...args: T) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Error boundary helper
export const withErrorBoundary = <T>(
  operation: () => T,
  fallback: T,
  errorMessage?: string
): T => {
  try {
    return operation();
  } catch (error) {
    console.error(errorMessage || 'Operation failed:', error);
    return fallback;
  }
};

// Promise with timeout
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
};

// Retry logic for failed operations
export const retry = async <T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
};