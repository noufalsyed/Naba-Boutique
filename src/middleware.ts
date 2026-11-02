// Edge middleware:
//  • Cheap signature check of the staff session cookie for /admin pages (the
//    API routes re-check the session against the database).
//  • Same-origin enforcement (CSRF) for state-changing API calls; the payment
//    webhook and cron endpoints use their own signatures instead.
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_ADMIN = /^\/admin\/(login|forgot-password|reset-password)(\/|$)/;
const NO_CSRF = /^\/api\/(payments\/webhook|cron\/)/;

async function validToken(token: string | undefined) {
  if (!token || !process.env.AUTH_SECRET) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET), { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  if (pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(method) && !NO_CSRF.test(pathname)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    if (!origin || !host || new URL(origin).host !== host) {
      return NextResponse.json({ error: { message: 'Cross-site request blocked', code: 'CSRF' } }, { status: 403 });
    }
  }

  if (pathname.startsWith('/admin') && !PUBLIC_ADMIN.test(pathname)) {
    if (!(await validToken(req.cookies.get('fts_admin')?.value))) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }
  }

  const res = NextResponse.next();
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    res.headers.set('Cache-Control', 'no-store');
  }
  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
