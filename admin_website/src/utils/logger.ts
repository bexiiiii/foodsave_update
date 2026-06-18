/**
 * Safe Logger Utility
 * 
 * SECURITY: This logger is disabled in production to prevent data leaks.
 * Never logs sensitive data like tokens, passwords, emails, phone numbers.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// List of sensitive keywords that should never be logged
const SENSITIVE_KEYWORDS = [
  'token',
  'password',
  'auth',
  'secret',
  'key',
  'credential',
  'authorization',
  'bearer',
  'jwt',
  'session',
  'cookie',
  'email',
  'phone',
  'ssn',
  'credit',
  'card',
  'cvv',
  'pin'
];

/**
 * Check if data contains sensitive information
 */
function containsSensitiveData(data: any): boolean {
  if (!data) return false;
  
  const dataStr = JSON.stringify(data).toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => dataStr.includes(keyword));
}

/**
 * Sanitize data by removing sensitive fields
 */
function sanitizeData(data: any): any {
  if (!data) return data;
  
  if (typeof data === 'object') {
    const sanitized: any = Array.isArray(data) ? [] : {};
    
    for (const key in data) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYWORDS.some(keyword => lowerKey.includes(keyword));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof data[key] === 'object') {
        sanitized[key] = sanitizeData(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    }
    
    return sanitized;
  }
  
  return data;
}

/**
 * Safe logger that:
 * - Disables in production
 * - Sanitizes sensitive data
 * - Prevents accidental data leaks
 */
export const logger = {
  log: (...args: any[]) => {
    if (IS_PRODUCTION) return;
    
    const sanitized = args.map(arg => 
      typeof arg === 'object' ? sanitizeData(arg) : arg
    );
    console.log('[DEV]', ...sanitized);
  },
  
  warn: (...args: any[]) => {
    if (IS_PRODUCTION) return;
    
    const sanitized = args.map(arg => 
      typeof arg === 'object' ? sanitizeData(arg) : arg
    );
    console.warn('[DEV]', ...sanitized);
  },
  
  error: (...args: any[]) => {
    // Errors are logged even in production but sanitized
    const sanitized = args.map(arg => {
      if (arg instanceof Error) {
        return {
          message: arg.message,
          name: arg.name,
          // Don't include stack trace in production
          stack: IS_PRODUCTION ? undefined : arg.stack
        };
      }
      return typeof arg === 'object' ? sanitizeData(arg) : arg;
    });
    
    console.error(IS_PRODUCTION ? '[PROD ERROR]' : '[DEV ERROR]', ...sanitized);
  },
  
  debug: (...args: any[]) => {
    // Debug is completely disabled in production
    if (IS_PRODUCTION) return;
    
    const sanitized = args.map(arg => 
      typeof arg === 'object' ? sanitizeData(arg) : arg
    );
    console.debug('[DEV DEBUG]', ...sanitized);
  },
  
  info: (...args: any[]) => {
    if (IS_PRODUCTION) return;
    
    const sanitized = args.map(arg => 
      typeof arg === 'object' ? sanitizeData(arg) : arg
    );
    console.info('[DEV INFO]', ...sanitized);
  }
};

// Export helper to check if logging is enabled
export const isLoggingEnabled = () => !IS_PRODUCTION;

// Export sanitizer for custom use
export { sanitizeData, containsSensitiveData };
