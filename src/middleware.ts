import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/server/http';

const API_PREFIX = '/api/';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('fm_session')?.value;
  const session = await verifySession(token);

  const { pathname } = req.nextUrl;

  // API paths (the matcher only includes the protected API groups and the
  // (protected) page group, so any '/api/...' here is an API request).
  if (pathname.startsWith(API_PREFIX)) {
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'unauthenticated' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    return NextResponse.next();
  }

  // (protected) page paths: redirect unauthenticated users to /login.
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/customer/:path*',
    '/api/driver/:path*',
    '/api/users/:path*',
    '/api/moves/:path*',
    '/api/guest/:path*',
    '/api/admin/:path*',
    '/customer/:path*',
    '/driver/:path*',
  ],
};
