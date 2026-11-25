import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { ensureAccessColumns } from '@/lib/db-init';

const SUPER_KEY = process.env.SUPER_ADMIN_KEY || '';

function isAuthorized(request: NextRequest): boolean {
  if (!SUPER_KEY) return false;
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

  const results: string[] = [];

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.user_tenants (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        tenant VARCHAR(63) NOT NULL,
        identificacion VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    results.push('✅ Tabla public.user_tenants verificada');

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_tenants' AND column_name='identificacion') THEN
          ALTER TABLE public.user_tenants ADD COLUMN identificacion VARCHAR(50);
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.tenants_config (
        tenant VARCHAR(63) PRIMARY KEY,
        primary_color VARCHAR(7) DEFAULT '#3b82f6',
        secondary_color VARCHAR(7) DEFAULT '#6366f1',
        logo_url TEXT,
        activo BOOLEAN DEFAULT true,
        session_version INTEGER DEFAULT 0,
        font_family VARCHAR(255) DEFAULT 'Inter',
        config JSONB DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    results.push('✅ Tabla public.tenants_config (Temas) verificada');

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants_config' AND column_name='activo') THEN
          ALTER TABLE public.tenants_config ADD COLUMN activo BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants_config' AND column_name='session_version') THEN
          ALTER TABLE public.tenants_config ADD COLUMN session_version INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants_config' AND column_name='font_family') THEN
          ALTER TABLE public.tenants_config ADD COLUMN font_family VARCHAR(255) DEFAULT 'Inter';
        END IF;
      END $$;
    `);
    results.push('✅ Columnas activo/session_version/font_family agregadas a tenants_config');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.system_logs (
        id SERIAL PRIMARY KEY,
        tenant VARCHAR(63) NOT NULL,
        usuario_email VARCHAR(255) NOT NULL,
        usuario_nombre VARCHAR(255),
        modulo VARCHAR(100),
        accion TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    results.push('✅ Tabla public.system_logs (Auditoría) verificada');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_tenants_email ON public.user_tenants(email)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_system_logs_tenant ON public.system_logs(tenant)
    `);
    results.push('✅ Índices globales verificados');

    await ensureAccessColumns();
    results.push('✅ Columnas de acceso (session_version / dia_d_level) verificadas');

    return NextResponse.json({
      success: true,
      message: 'Base de datos inicializada correctamente',
      results
    });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${(error as any).message}` }, { status: 500 });
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
