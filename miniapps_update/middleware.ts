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

function containsBlockedPattern(value: string): boolean {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(value));
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;
  const searchParams = url.search;
  
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';

  if (BLOCKED_IPS.includes(ip)) {
    console.log(`[SECURITY] Blocked IP: ${ip}`);
    return new NextResponse('Forbidden', { status: 403 });
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
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  
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
