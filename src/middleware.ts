import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Enforce auth only when ADMIN_PASSWORD is configured in environment variables
  const validPassword = process.env.ADMIN_PASSWORD;
  if (!validPassword) {
    return NextResponse.next();
  }

  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    try {
      const authValue = basicAuth.split(' ')[1];
      // Decode Base64 auth string (username:password)
      const [user, pwd] = atob(authValue).split(':');

      const validUser = process.env.ADMIN_USERNAME || 'admin';

      if (user === validUser && pwd === validPassword) {
        return NextResponse.next();
      }
    } catch (err) {
      console.error('Failed to parse authorization header:', err);
    }
  }

  // Request browser HTTP Basic Auth credentials
  return new NextResponse('Authentication Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Plane AI Command Center"',
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets & favicon
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
