import { pool } from './db';
import type { NextRequest } from 'next/server';

export function sanitizeTenantValue(raw?: string | null) {
  if (!raw) return null;
  const t = String(raw).trim().toLowerCase();
  // Allow only lowercase letters, numbers and underscore. Limit length to 63 (Postgres limit for identifiers)
  if (!/^[a-z0-9_]+$/.test(t)) return null;
  if (t.length === 0 || t.length > 63) return null;
  return t;
}

export function getTenantFromRequest(req: NextRequest | { headers?: any; cookies?: any } | string | undefined) {
  if (!req) return null;
  if (typeof req === 'string') return sanitizeTenantValue(req);
  
  const headers = (req as any).headers;
  const cookies = (req as any).cookies;

  // 1. Check Header (set by middleware)
  if (headers && typeof headers.get === 'function') {
    const t = headers.get('x-tenant');
    const s = sanitizeTenantValue(t);
    if (s) return s;
  }

  // 2. Check Cookie
  if (cookies) {
    if (typeof cookies.get === 'function') {
      const c = cookies.get('tenant');
      if (c && c.value) {
        const s = sanitizeTenantValue(c.value);
        if (s) return s;
      }
    }
  }

  // 3. Check Hostname (Subdomain)
  if (headers && typeof headers.get === 'function') {
    const host = headers.get('host') || '';
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost';
    if (host && host.includes(baseDomain) && host !== baseDomain) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'admin') {
        const s = sanitizeTenantValue(subdomain);
        if (s) return s;
      }
    }
  }

  // 4. Check Authorization header (JWT token)
  if (headers && typeof headers.get === 'function') {
    const auth = headers.get('authorization');
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const token = auth.slice(7);
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload && payload.tenant) {
          const s = sanitizeTenantValue(payload.tenant);
          if (s) return s;
        }
      } catch {
        // Ignore token parse errors
      }
    }
  }

  // 5. Check URL query parameter (for localhost without subdomain)
  if (typeof req === 'object' && req !== null && 'nextUrl' in (req as any)) {
    try {
      const url = (req as any).nextUrl as URL;
      const t = url.searchParams.get('tenant');
      if (t) {
        const s = sanitizeTenantValue(t);
        if (s) return s;
      }
    } catch {}
  } else if (typeof req === 'object' && req !== null && 'url' in (req as any)) {
    try {
      const url = new URL((req as any).url);
      const t = url.searchParams.get('tenant');
      if (t) {
        const s = sanitizeTenantValue(t);
        if (s) return s;
      }
    } catch {}
  }

  return null;
}

export async function queryWithTenant(tenant: string | null, sql: string, params: any[] = []) {
  const t = sanitizeTenantValue(tenant || undefined);
  if (!t) throw new Error('Tenant no especificado o inválido para queryWithTenant');
  const client = await pool.connect();
  try {
    // tenant is validated and lowercased - safe to interpolate into SET search_path
    await client.query(`SET search_path TO "${t}", public`);
    const res = await client.query(sql, params);
    return res;
  } finally {
    client.release();
  }
}
