import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Dashboard routes that require login
const protectedPrefixes = [
  '/overview',
  '/monitoring',
  '/override',
  '/notifications',
  '/settings',
  '/irrigation',
  '/schedules',
  '/devices',
  '/eco-savings',
  '/agri-twin',
];

// Auth pages that should redirect logged-in users to dashboard
const authPaths = ['/login', '/register', '/forgot-password'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for our auth marker cookie
  const isAuthenticated = request.cookies.has('ng-auth');

  const isProtectedPath = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isAuthPath = authPaths.some((p) => pathname.startsWith(p));

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/overview', request.url));
  }

  // Redirect root "/" based on auth state
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(isAuthenticated ? '/overview' : '/login', request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
};
