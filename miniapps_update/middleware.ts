import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Blocked patterns (attack signatures)
const BLOCKED_PATTERNS = [
  /returnNaN/i,
  /lrt/i,
  /\.\.\/|\.\.\\/, // Path traversal
  /<script/i,
  /javascript:/i,
  /onerror/i,
  /onload/i,
  /eval\(/i,
  /document\./i,
  /window\./i,
  /fetch\(/i,
  /__proto__/i,
  /constructor\[/i,
];

// Blocked IPs (known attackers)
const BLOCKED_IPS = [
  '205.185.127.97',
];

// Rate limiting map (in-memory, resets on restart)
const requestCounts = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW = 60000; // 1 minute

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now - record.timestamp > RATE_WINDOW) {
    requestCounts.set(ip, { count: 1, timestamp: now });
    return false;
  }
  
  record.count++;
  
  if (record.count > RATE_LIMIT) {
    return true;
  }
  
  return false;
}

function containsBlockedPattern(value: string): boolean {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(value));
}

export function middleware(request: NextRequest) {
  const ip = getClientIP(request);
  const url = request.nextUrl;
  const pathname = url.pathname;
  const searchParams = url.search;
  
  // Block known bad IPs
  if (BLOCKED_IPS.includes(ip)) {
    console.log(`[SECURITY] Blocked IP: ${ip}`);
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // Rate limiting
  if (isRateLimited(ip)) {
    console.log(`[SECURITY] Rate limited: ${ip}`);
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  
  // Check URL path for malicious patterns
  if (containsBlockedPattern(pathname)) {
    console.log(`[SECURITY] Blocked malicious path: ${pathname} from ${ip}`);
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // Check query params for malicious patterns
  if (containsBlockedPattern(searchParams)) {
    console.log(`[SECURITY] Blocked malicious query: ${searchParams} from ${ip}`);
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // Block suspicious file extensions
  const blockedExtensions = ['.php', '.asp', '.aspx', '.jsp', '.cgi', '.env', '.git', '.sql'];
  if (blockedExtensions.some(ext => pathname.toLowerCase().endsWith(ext))) {
    console.log(`[SECURITY] Blocked suspicious extension: ${pathname} from ${ip}`);
    return new NextResponse('Not Found', { status: 404 });
  }
  
  // Block direct access to sensitive paths
  const blockedPaths = ['/dev/', '/etc/', '/var/', '/proc/', '/sys/', '/.git/', '/.env'];
  if (blockedPaths.some(path => pathname.toLowerCase().includes(path))) {
    console.log(`[SECURITY] Blocked sensitive path: ${pathname} from ${ip}`);
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // Add security headers
  const response = NextResponse.next();
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
