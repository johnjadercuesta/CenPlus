import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware sencillo para detectar tenant por subdominio.
 * - tenant.example.com -> tenant
 * - tenant.localhost -> tenant (cuando se mapea en hosts)
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');

  let tenant: string | null = null;
  if (parts.length >= 3) {
    tenant = parts[0];
  } else if (hostname.endsWith('localhost')) {
    // soporta tenant.localhost cuando el host se mapea en /etc/hosts
    const maybe = hostname.split('.');
    if (maybe.length >= 2 && maybe[0] !== 'localhost') tenant = maybe[0];
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
