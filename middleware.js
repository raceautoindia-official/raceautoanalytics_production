// middleware.js
import { NextResponse } from 'next/server';

const API_SECRET = process.env.API_SECRET;
const BASIC_USER = 'admin';
const BASIC_PASS = 'letMeIn321';

export function middleware(req) {
  const { pathname } = req.nextUrl;

  const protectedPaths = ['/admin', '/forecast-new'];
  const isProtected = protectedPaths.some((path) => pathname === path || pathname.startsWith(path + '/'));

  if (isProtected) {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Basic ')) {
      return unauthorizedBasic();
    }

    const base64Credentials = authHeader.slice(6).trim();
    let decoded;
    try {
      decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
    } catch {
      return unauthorizedBasic();
    }

    const [user, pass] = decoded.split(':');
    if (user !== BASIC_USER || pass !== BASIC_PASS) {
      return unauthorizedBasic();
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

function unauthorizedBasic() {
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/forecast-new',
    '/forecast-new/:path*',
    '/score-card',
    '/score-card/:path*',
  ],
};
