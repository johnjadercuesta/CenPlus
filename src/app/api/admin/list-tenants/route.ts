import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

const SUPER_KEY = process.env.SUPER_ADMIN_KEY || '';

function checkSuperKey(request: NextRequest): boolean {
  if (!SUPER_KEY) return false; // If not configured, deny all
  const key = request.headers.get('x-super-key') || '';
  return key === SUPER_KEY;
}

/**
 * GET /api/admin/list-tenants
 * Lista todos los schemas/tenants activos (requiere SUPER_ADMIN_KEY)
 */
export async function GET(request: NextRequest) {
  if (!checkSuperKey(request)) {
    return NextResponse.json(
      { error: 'No autorizado. Se requiere SUPER_ADMIN_KEY válida.' },
      { status: 401 }
    );
  }

  try {
    // List all non-system schemas
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
        // Get admin email for this tenant
        const { rows: admins } = await pool.query(
          `SELECT email, created_at FROM "${schemaName}".admins WHERE role = 'administrador' LIMIT 1`
        );

        // Count ciudadanos
        let ciudadanosCount = 0;
        try {
          const { rows: countRows } = await pool.query(
            `SELECT COUNT(*) as total FROM "${schemaName}".ciudadanos`
          );
          ciudadanosCount = parseInt(countRows[0]?.total || '0');
        } catch {
          // Table may not exist
        }

        tenants.push({
          name: schemaName,
          email: admins[0]?.email || 'N/A',
          created: admins[0]?.created_at || null,
          ciudadanos: ciudadanosCount,
        });
      } catch {
        // Schema exists but no admins table - still list it
        tenants.push({
          name: schemaName,
          email: 'Sin admin',
          created: null,
          ciudadanos: 0,
        });
      }
    }

    return NextResponse.json({
      total: tenants.length,
      tenants,
    });
  } catch (error) {
    console.error('list-tenants error:', error);
    return NextResponse.json(
      { error: `Error en base de datos: ${(error as any).message}` },
      { status: 500 }
    );
  }
}
