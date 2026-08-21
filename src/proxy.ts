import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, isValidAuthToken } from '@/lib/auth';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow access to login page, login/logout API endpoints, and static assets —
  // includes the App Router-generated icon routes (icon.tsx/apple-icon.tsx have no file
  // extension, so the matcher's asset-extension exclusion below doesn't catch them).
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname === '/icon' ||
    pathname === '/apple-icon'
  ) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (isValidAuthToken(authCookie)) {
    return NextResponse.next();
  }

  // Handle unauthorized requests
  if (pathname.startsWith('/api')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets & favicon
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
