import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth-token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/icon.png') ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  // 2. If user visits /login
  if (pathname === '/login') {
    if (session) {
      // Already authenticated -> redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 3. Protected route: user is NOT authenticated
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/' && pathname !== '/dashboard') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 4. Role-Based Route Guards
  const role = session.role || 'Mitarbeiter';

  // Only QMB / Admin may access Administration (/settings, /users)
  if (pathname.startsWith('/settings') || pathname.startsWith('/users')) {
    if (role !== 'QMB') {
      const deniedUrl = new URL('/dashboard', request.url);
      deniedUrl.searchParams.set('unauthorized', 'true');
      return NextResponse.redirect(deniedUrl);
    }
  }

  // Mitarbeiter may not edit norm matrix
  if (role === 'Mitarbeiter' && pathname.startsWith('/matrix')) {
    const deniedUrl = new URL('/action-log', request.url);
    deniedUrl.searchParams.set('unauthorized', 'true');
    return NextResponse.redirect(deniedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
