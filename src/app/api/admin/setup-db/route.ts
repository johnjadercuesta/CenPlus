import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

const SUPER_KEY = process.env.SUPER_ADMIN_KEY || '';

/**
 * Robust Authorization:
 * ONLY allows access if SUPER_ADMIN_KEY is set in environment AND matches the header.
 */
function isAuthorized(request: NextRequest): boolean {
  if (!SUPER_KEY) return false; // Block everything if no key is configured in env
  const key = request.headers.get('x-super-key') || '';
  return key === SUPER_KEY;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Acceso Denegado. Se requiere una SUPER_ADMIN_KEY válida.' },
      { status: 401 }
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL no configurada' }, { status: 500 });
  }

  const client = await pool.connect();
  const results: string[] = [];

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_tenants (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        tenant VARCHAR(63) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    results.push('✅ Tabla public.user_tenants verificada');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenants_config (
        tenant VARCHAR(63) PRIMARY KEY,
        primary_color VARCHAR(7) DEFAULT '#3b82f6',
        secondary_color VARCHAR(7) DEFAULT '#6366f1',
        logo_url TEXT,
        config JSONB DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    results.push('✅ Tabla public.tenants_config (Temas) verificada');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_tenants_email ON public.user_tenants(email)
    `);
    results.push('✅ Índices globales verificados');

    return NextResponse.json({
      success: true,
      message: 'Base de datos inicializada correctamente',
      results
    });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${(error as any).message}` }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { rows: tableRows } = await pool.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_tenants') as exists
    `);
    const { rows: schemas } = await pool.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public') AND schema_name NOT LIKE 'pg_%'
    `);

    return NextResponse.json({
      dbReady: tableRows[0]?.exists === true,
      tenantsCount: schemas.length,
      tenants: schemas.map(s => s.schema_name)
    });
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
