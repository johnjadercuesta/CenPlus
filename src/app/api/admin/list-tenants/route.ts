import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

const SUPER_KEY = process.env.SUPER_ADMIN_KEY || '';

function isAuthorized(request: NextRequest): boolean {
  if (!SUPER_KEY) return false;
  const key = request.headers.get('x-super-key') || '';
  return key === SUPER_KEY;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Acceso Denegado. Se requiere SUPER_ADMIN_KEY valida.' },
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
          `SELECT email, identificacion, nombre, role, activo, created_at FROM "${schemaName}".admins ORDER BY role, created_at`
        );
        
        let ciudadanosCount = 0;
        try {
          const { rows: countRows } = await pool.query(
            `SELECT COUNT(*) as total FROM "${schemaName}".ciudadanos`
          );
          ciudadanosCount = parseInt(countRows[0]?.total || '0');
        } catch { /* table may not exist */ }

        const adminUser = admins.find(a => a.role === 'administrador');
        const testUsers = admins.filter(a => a.role !== 'administrador');

        let activo = true;
        try {
          const { rows: tc } = await pool.query(
            'SELECT activo FROM public.tenants_config WHERE tenant = $1',
            [schemaName]
          );
          if (tc.length > 0) activo = tc[0].activo !== false;
        } catch { /* table may not exist */ }

        tenants.push({
          name: schemaName,
          activo,
          email: adminUser?.email || 'N/A',
          identificacion: adminUser?.identificacion || adminUser?.email || 'N/A',
          adminName: adminUser?.nombre || 'N/A',
          created: adminUser?.created_at || null,
          ciudadanos: ciudadanosCount,
          testUsers: testUsers.map(u => ({
            email: u.email,
            identificacion: u.identificacion || u.email,
            nombre: u.nombre,
            role: u.role,
          })),
        });
      } catch (e: any) {
        tenants.push({ 
          name: schemaName,
          activo: true,
          email: 'Error al leer', 
          adminName: 'N/A',
          created: null, 
          ciudadanos: 0,
          testUsers: [],
          error: e.message 
        });
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
