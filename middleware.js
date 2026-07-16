// middleware.js
import { NextResponse } from 'next/server';
import { SEO_SKIP_PREFIXES, isIndexableSeoPath } from './lib/seoRoutes.js';

const BASIC_USER = process.env.ADMIN_BASIC_USER || 'admin';
const BASIC_PASS = process.env.ADMIN_BASIC_PASS || 'letMeIn321';

export function middleware(req) {
  const { pathname } = req.nextUrl;

  const protectedPaths = ['/admin', '/forecast-new'];
  const isProtected = protectedPaths.some((path) => pathname === path || pathname.startsWith(path + '/'));

  if (isProtected) {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Basic ')) {
      return unauthorizedBasic(true);
    }

    const base64Credentials = authHeader.slice(6).trim();
    let decoded;
    try {
      decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
    } catch {
      return unauthorizedBasic(true);
    }

    const [user, pass] = decoded.split(':');
    if (user !== BASIC_USER || pass !== BASIC_PASS) {
      return unauthorizedBasic(true);
    }

    return withSeoHeaders(NextResponse.next(), pathname);
  }

  return withSeoHeaders(NextResponse.next(), pathname);
}

function unauthorizedBasic(noindex = false) {
  const headers = {
    'WWW-Authenticate': 'Basic realm="Secure Area"',
  };

  if (noindex) {
    headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive';
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers,
  });
}

function withSeoHeaders(res, pathname) {
  if (SEO_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return res;
  }

  if (!isIndexableSeoPath(pathname)) {
    res.headers.set('X-Robots-Tag', 'noindex, follow, noarchive');
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)',
  ],
};
