import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

const SUPER_KEY = process.env.SUPER_ADMIN_KEY || '';

/**
 * Strict Authorization:
 * ONLY allows access if SUPER_ADMIN_KEY is set in environment AND matches the header.
 */
function isAuthorized(request: NextRequest): boolean {
  if (!SUPER_KEY) return false; // Block if key is missing in env
  const key = request.headers.get('x-super-key') || '';
  return key === SUPER_KEY;
}

/**
 * GET /api/admin/list-tenants
 * Lists all active tenant schemas.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Acceso Denegado. Se requiere SUPER_ADMIN_KEY válida.' },
      { status: 401 }
    );
  }

  try {
    const { rows: schemas } = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
        AND schema_name NOT LIKE 'pg_%'
      ORDER BY schema_name
    `);

    const tenants = [];

    for (const s of schemas) {
      const schemaName = s.schema_name;
      try {
        const { rows: admins } = await pool.query(
          `SELECT email, created_at FROM "${schemaName}".admins WHERE role = 'administrador' LIMIT 1`
        );
        let ciudadanosCount = 0;
        try {
          const { rows: countRows } = await pool.query(
            `SELECT COUNT(*) as total FROM "${schemaName}".ciudadanos`
          );
          ciudadanosCount = parseInt(countRows[0]?.total || '0');
        } catch { /* table may not exist */ }

        tenants.push({
          name: schemaName,
          email: admins[0]?.email || 'N/A',
          created: admins[0]?.created_at || null,
          ciudadanos: ciudadanosCount,
        });
      } catch {
        tenants.push({ name: schemaName, email: 'Sin admin', created: null, ciudadanos: 0 });
      }
    }

    return NextResponse.json({ total: tenants.length, tenants });
  } catch (error) {
    return NextResponse.json(
      { error: `Error: ${(error as any).message}` },
      { status: 500 }
    );
  }
}
