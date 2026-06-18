import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Определяем какие страницы доступны для каждой роли
const rolePermissions = {
  STORE_MANAGER: [
    '/analytics',
    '/orders', 
    '/products',
    '/profile',
    '/manager-dashboard',
    '/dev-auth' // для разработки
  ],
  STORE_OWNER: [
    '/',
    '/analytics',
    '/orders',
    '/products',
    '/categories',
    '/stores',
    '/carts',
    '/history',
    '/notifications',
    '/user-store-management',
    '/my-store-dashboard',
    '/calendar',
    '/profile',
    '/dev-auth'
  ],
  SUPER_ADMIN: [
    // SUPER_ADMIN имеет доступ ко всем страницам
    '/',
    '/analytics',
    '/orders',
    '/products',
    '/categories',
    '/stores',
    '/users',
    '/carts',
    '/history',
    '/notifications',
    '/user-store-management',
    '/my-store-dashboard',
    '/calendar',
    '/profile',
    '/health',
    '/roles',
    '/manager-dashboard',
    '/dev-auth'
  ]
};

function hasAccess(userRole: string, pathname: string): boolean {
  const allowedPaths = rolePermissions[userRole as keyof typeof rolePermissions];
  
  if (!allowedPaths) {
    return false;
  }
  
  // Проверяем точное совпадение или совпадение с началом пути
  return allowedPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const userRole = request.cookies.get('userRole')?.value // Предполагаем, что роль хранится в cookie
  const isAuthPage = request.nextUrl.pathname.startsWith('/signin') || 
                    request.nextUrl.pathname.startsWith('/signup') ||
                    request.nextUrl.pathname.startsWith('/admin/signin') ||
                    request.nextUrl.pathname.startsWith('/admin/signup')

  // If trying to access auth pages while logged in, redirect to dashboard
  if (isAuthPage && token) {
    // Редирект в зависимости от роли
    if (userRole === 'STORE_MANAGER') {
      return NextResponse.redirect(new URL('/manager-dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If trying to access protected pages while not logged in, redirect to login
  if (!isAuthPage && !token) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // Проверяем доступ к странице для авторизованных пользователей
  if (!isAuthPage && token && userRole) {
    const pathname = request.nextUrl.pathname;
    
    // Разрешаем доступ к API и статическим ресурсам
    if (pathname.startsWith('/api') || 
        pathname.startsWith('/_next') || 
        pathname.startsWith('/images') ||
        pathname.startsWith('/favicon')) {
      return NextResponse.next();
    }
    
    if (!hasAccess(userRole, pathname)) {
      // Редирект на разрешенную страницу в зависимости от роли
      if (userRole === 'STORE_MANAGER') {
        return NextResponse.redirect(new URL('/manager-dashboard', request.url))
      } else if (userRole === 'STORE_OWNER') {
        return NextResponse.redirect(new URL('/', request.url))
      } else {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
} 