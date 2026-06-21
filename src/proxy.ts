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

  '/agri-twin',
];

// Auth pages that should redirect logged-in users to dashboard
const authPaths = ['/login', '/register', '/forgot-password'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isViewer = request.nextUrl.searchParams.get('mode') === 'viewer';

  // Check for our auth marker cookie or viewer parameter
  const isAuthenticated = request.cookies.has('ng-auth') || isViewer;

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
    const redirectUrl = new URL('/overview', request.url);
    if (isViewer) redirectUrl.searchParams.set('mode', 'viewer');
    const response = NextResponse.redirect(redirectUrl);
    if (isViewer) {
      response.cookies.set('ng-auth', '1', { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 });
    }
    return response;
  }

  // Redirect root "/" based on auth state
  if (pathname === '/') {
    const redirectUrl = new URL(isAuthenticated ? '/overview' : '/login', request.url);
    if (isViewer) redirectUrl.searchParams.set('mode', 'viewer');
    const response = NextResponse.redirect(redirectUrl);
    if (isViewer) {
      response.cookies.set('ng-auth', '1', { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 });
    }
    return response;
  }

  // If in viewer mode on other protected pages, ensure cookie is set
  if (isViewer) {
    const response = NextResponse.next();
    response.cookies.set('ng-auth', '1', { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
};
