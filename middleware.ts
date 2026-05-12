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
 * Middleware sencillo para detectar tenant por subdominio.
 * Solo detecta tenant en dominios personalizados (no en hosting conocidos ni localhost).
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');

  const isHostingDomain = HOSTING_DOMAINS.some(d => hostname.endsWith(d));
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  let tenant: string | null = null;

  if (!isHostingDomain && !isLocalhost && parts.length >= 3) {
    tenant = parts[0];
  }

  const res = NextResponse.next();
  if (tenant) {
    res.headers.set('x-tenant', tenant);
    res.cookies.set('tenant', tenant, { path: '/' });
  }
  return res;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
