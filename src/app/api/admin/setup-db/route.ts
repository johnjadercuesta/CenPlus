import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

const SUPER_KEY = process.env.SUPER_ADMIN_KEY || '';

/**
 * Checks if the request is authorized.
 * Authorization logic:
 * 1. If SUPER_ADMIN_KEY is not set → always allow (open deployment)
 * 2. If no tenants exist yet (first-time setup) → allow without key
 * 3. If key matches → allow
 * 4. Otherwise → deny
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  // If no key is configured, allow everything
  if (!SUPER_KEY) return true;

  // If key matches, allow
  const key = request.headers.get('x-super-key') || '';
  if (key === SUPER_KEY) return true;

  // First-time setup: if no tenant schemas exist yet, allow without key
  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*) as cnt
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
        AND schema_name NOT LIKE 'pg_%'
    `);
    const count = parseInt(rows[0]?.cnt || '0');
    if (count === 0) return true; // First-run mode: no tenants yet
  } catch {
    // If we can't check, deny
  }

  return false;
}

/**
 * POST /api/admin/setup-db
 * Initializes global tables needed for multi-tenancy.
 * Run once after deploying to Railway.
 */
export async function POST(request: NextRequest) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'No autorizado. Se requiere SUPER_ADMIN_KEY válida en header x-super-key.' },
      { status: 401 }
    );
  }

  const client = await pool.connect();
  const results: string[] = [];

  try {
    // Create global user_tenants mapping table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_tenants (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        tenant VARCHAR(63) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    results.push('✅ Tabla public.user_tenants creada/verificada');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_tenants_email ON public.user_tenants(email)
    `);
    results.push('✅ Índice user_tenants_email creado/verificado');

    // List existing schemas
    const { rows: schemas } = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
        AND schema_name NOT LIKE 'pg_%'
      ORDER BY schema_name
    `);

    results.push(
      `📋 Tenants existentes: ${
        schemas.length === 0
          ? 'ninguno aún — ¡listo para crear el primero!'
          : schemas.map((s) => s.schema_name).join(', ')
      }`
    );

    return NextResponse.json({
      success: true,
      message: 'Base de datos inicializada correctamente',
      results,
      nextStep: 'Crea tu primer tenant en la pestaña "Crear Tenant"',
    });
  } catch (error) {
    console.error('setup-db error:', error);
    return NextResponse.json(
      { error: `Error de base de datos: ${(error as any).message}`, results },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * GET /api/admin/setup-db
 * Returns current database status. Always public (no sensitive data exposed).
 */
export async function GET() {
  try {
    // Check if user_tenants exists
    const { rows: tableRows } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_tenants'
      ) as exists
    `);

    const { rows: schemas } = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
        AND schema_name NOT LIKE 'pg_%'
      ORDER BY schema_name
    `);

    const isFirstRun = schemas.length === 0;

    return NextResponse.json({
      dbReady: tableRows[0]?.exists === true,
      tenantsCount: schemas.length,
      tenants: schemas.map((s) => s.schema_name),
      firstRun: isFirstRun,
      requiresKey: !!SUPER_KEY && !isFirstRun,
      message: isFirstRun
        ? '🚀 Primera instalación — ve a /setup para inicializar'
        : `✅ Sistema activo con ${schemas.length} tenant(s)`,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
