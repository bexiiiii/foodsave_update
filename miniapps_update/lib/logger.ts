/**
 * Safe Logger Utility for MiniApp
 * 
 * SECURITY: This logger is disabled in production to prevent data leaks.
 * Never logs sensitive data like tokens, passwords, user data.
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
  'email',
  'phone',
  'telegram',
  'user_id',
  'chat_id'
];

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
    console.log('[MINIAPP DEV]', ...sanitized);
  },
  
  warn: (...args: any[]) => {
    if (IS_PRODUCTION) return;
    
    const sanitized = args.map(arg => 
      typeof arg === 'object' ? sanitizeData(arg) : arg
    );
    console.warn('[MINIAPP DEV]', ...sanitized);
  },
  
  error: (...args: any[]) => {
    // Errors are logged even in production but sanitized
    const sanitized = args.map(arg => {
      if (arg instanceof Error) {
        return {
          message: arg.message,
          name: arg.name,
          stack: IS_PRODUCTION ? undefined : arg.stack
        };
      }
      return typeof arg === 'object' ? sanitizeData(arg) : arg;
    });
    
    console.error(IS_PRODUCTION ? '[MINIAPP ERROR]' : '[MINIAPP DEV ERROR]', ...sanitized);
  },
  
  debug: (...args: any[]) => {
    if (IS_PRODUCTION) return;
    
    const sanitized = args.map(arg => 
      typeof arg === 'object' ? sanitizeData(arg) : arg
    );
    console.debug('[MINIAPP DEBUG]', ...sanitized);
  }
};

export const isLoggingEnabled = () => !IS_PRODUCTION;
export { sanitizeData };
