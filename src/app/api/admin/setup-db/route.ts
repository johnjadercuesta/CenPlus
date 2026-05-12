import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

const SUPER_KEY = process.env.SUPER_ADMIN_KEY || '';

/**
 * POST /api/admin/setup-db
 * 
 * Initializes global tables needed for multi-tenancy.
 * Run this ONCE after deploying to Railway to prepare the database.
 * 
 * Protected by SUPER_ADMIN_KEY environment variable.
 */
export async function POST(request: NextRequest) {
  // Check SUPER_ADMIN_KEY
  if (SUPER_KEY) {
    const key = request.headers.get('x-super-key') || '';
    if (key !== SUPER_KEY) {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere SUPER_ADMIN_KEY válida.' },
        { status: 401 }
      );
    }
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

    results.push(`📋 Esquemas (tenants) existentes: ${schemas.length === 0 ? 'ninguno aún' : schemas.map(s => s.schema_name).join(', ')}`);

    return NextResponse.json({
      success: true,
      message: 'Base de datos inicializada correctamente',
      results,
      nextStep: 'Ahora ve a /setup para crear tu primer tenant',
    });
  } catch (error) {
    console.error('setup-db error:', error);
    return NextResponse.json(
      { error: `Error: ${(error as any).message}`, results },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * GET /api/admin/setup-db
 * Check database status
 */
export async function GET(request: NextRequest) {
  // Check SUPER_ADMIN_KEY
  if (SUPER_KEY) {
    const key = request.headers.get('x-super-key') || '';
    if (key !== SUPER_KEY) {
      return NextResponse.json({ info: 'Este endpoint inicializa las tablas globales. Requiere SUPER_ADMIN_KEY.' });
    }
  }

  try {
    // Check if user_tenants exists
    const { rows } = await pool.query(`
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
    `);

    return NextResponse.json({
      dbReady: rows[0]?.exists === true,
      tenantsCount: schemas.length,
      tenants: schemas.map(s => s.schema_name),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
