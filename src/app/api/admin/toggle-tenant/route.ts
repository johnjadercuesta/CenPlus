import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

const SUPER_KEY = process.env.SUPER_ADMIN_KEY || '';

function isAuthorized(request: NextRequest): boolean {
  if (!SUPER_KEY) return false;
  const key = request.headers.get('x-super-key') || '';
  return key === SUPER_KEY;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Acceso Denegado. Se requiere SUPER_ADMIN_KEY valida.' },
      { status: 401 }
    );
  }

  try {
    const { tenant, activo } = await request.json();

    if (!tenant) {
      return NextResponse.json(
        { error: 'Falta el nombre del tenant' },
        { status: 400 }
      );
    }

    if (typeof activo !== 'boolean') {
      return NextResponse.json(
        { error: 'El campo activo debe ser booleano' },
        { status: 400 }
      );
    }

    await pool.query(`
      INSERT INTO public.tenants_config (tenant, activo, session_version)
      VALUES ($1, $2, 1)
      ON CONFLICT (tenant) DO UPDATE SET
        activo = $2,
        session_version = CASE WHEN $2 = TRUE THEN tenants_config.session_version ELSE tenants_config.session_version + 1 END,
        updated_at = NOW()
    `, [tenant, activo]);

    const { rows } = await pool.query(
      'SELECT activo, session_version FROM public.tenants_config WHERE tenant = $1',
      [tenant]
    );

    return NextResponse.json({
      success: true,
      tenant,
      activo: rows[0]?.activo ?? activo,
      session_version: rows[0]?.session_version ?? 0,
      message: activo
        ? `Organización '${tenant}' activada`
        : `Organización '${tenant}' desactivada — todas las sesiones se cerrarán`
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Error: ${(error as any).message}` },
      { status: 500 }
    );
  }
}
