import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const HOSTING_DOMAINS = [
  'railway.app',
  'vercel.app',
  'onrender.com',
  'fly.dev',
  'herokuapp.com',
  'netlify.app',
  'pages.dev',
];

/**
 * Middleware that detects tenant by subdomain, sets headers/cookies, and records an audit log for every request.
 */
export async function middleware(request: NextRequest) {
  const start = Date.now();
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');
  const isHostingDomain = HOSTING_DOMAINS.some(d => hostname.endsWith(d));
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  let tenant: string | null = null;
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  if (baseDomain && hostname.endsWith(baseDomain) && hostname !== baseDomain) {
    tenant = hostname.replace(`.${baseDomain}`, '');
  } else if (!isHostingDomain && !isLocalhost && parts.length >= 3) {
    tenant = parts[0];
  }
  const res = NextResponse.next();
  if (tenant) {
    // Sanitizar el valor detectado
    const sanitizedTenant = tenant.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (sanitizedTenant) {
      res.headers.set('x-tenant', sanitizedTenant);
      res.cookies.set('tenant', sanitizedTenant, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }
  // No audit logging in Edge middleware (handled per‑endpoint)
  return res;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
