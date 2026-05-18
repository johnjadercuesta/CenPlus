import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { verifyToken } from "@/lib/auth";
import { recordLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación y rol
    const token = request.cookies.get("token")?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'administrador') {
      return NextResponse.json({ error: "No autorizado. Solo administradores pueden cambiar la marca." }, { status: 401 });
    }

    let tenant = payload.tenant;
    if (!tenant) {
      // Si el administrador es global (sin tenant en token), intentamos detectarlo del request
      tenant = getTenantFromRequest(request);
    }

    if (!tenant || tenant === 'public') {
      return NextResponse.json({ error: "No se pudo identificar la organización para aplicar la marca." }, { status: 403 });
    }

    const { primary_color, secondary_color, logo_url } = await request.json();

    // 2. Validar colores (formato hex)
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (primary_color && !hexRegex.test(primary_color)) {
      return NextResponse.json({ error: "Formato de color inválido." }, { status: 400 });
    }

    // 3. Actualizar o Insertar configuración
    await pool.query(
      `INSERT INTO public.tenants_config (tenant, primary_color, secondary_color, logo_url, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (tenant) DO UPDATE SET 
         primary_color = EXCLUDED.primary_color,
         secondary_color = EXCLUDED.secondary_color,
         logo_url = EXCLUDED.logo_url,
         updated_at = NOW()`,
      [tenant, primary_color || '#162749', secondary_color || '#6366f1', logo_url || null]
    );

    return NextResponse.json({ success: true, message: "Configuración de marca actualizada." });
  } catch (error: any) {
    if (error.message.includes('relation "public.tenants_config" does not exist')) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS public.tenants_config (
            tenant VARCHAR(63) PRIMARY KEY,
            primary_color VARCHAR(7) DEFAULT '#3b82f6',
            secondary_color VARCHAR(7) DEFAULT '#6366f1',
            logo_url TEXT,
            config JSONB DEFAULT '{}',
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        // No hace falta reintentar el INSERT aquí, el usuario puede darle a Guardar de nuevo 
        // o podemos re-ejecutarlo. Por simplicidad, pedimos reintentar o lo hacemos:
        return NextResponse.json({ error: "La base de datos se estaba preparando. Por favor, dale a 'Guardar' una vez más." }, { status: 409 });
      } catch (e) {
        return NextResponse.json({ error: (e as any).message }, { status: 500 });
      }
    }
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
