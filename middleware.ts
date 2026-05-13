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

  // Si tenemos un dominio base configurado (ej: cenplus.com)
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  
  if (baseDomain && hostname.endsWith(baseDomain) && hostname !== baseDomain) {
    // Si hostname es cliente1.cenplus.com y baseDomain es cenplus.com
    tenant = hostname.replace(`.${baseDomain}`, '');
  } else if (!isHostingDomain && !isLocalhost && parts.length >= 3) {
    // Fallback para otros dominios personalizados con 3 partes
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
        secure: process.env.NODE_ENV === 'production'
      });
    }
  }
  return res;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
