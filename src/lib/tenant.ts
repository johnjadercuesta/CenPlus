import { pool } from './db';
import type { NextRequest } from 'next/server';

function sanitizeTenantValue(raw?: string | null) {
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
  if (headers && typeof headers.get === 'function') {
    const t = headers.get('x-tenant');
    const s = sanitizeTenantValue(t);
    if (s) return s;
  } else if (headers && headers['x-tenant']) {
    const s = sanitizeTenantValue(headers['x-tenant']);
    if (s) return s;
  }

  const cookies = (req as any).cookies;
  if (cookies) {
    // NextRequest.cookies.get('tenant') case
    if (typeof cookies.get === 'function') {
      const c = cookies.get('tenant');
      if (c) {
        const s = sanitizeTenantValue(c.value);
        if (s) return s;
      }
    } else if (cookies['tenant']) {
      const s = sanitizeTenantValue(cookies['tenant']);
      if (s) return s;
    }
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
