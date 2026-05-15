import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación y rol
    const token = request.cookies.get("token")?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'administrador') {
      return NextResponse.json({ error: "No autorizado. Solo administradores pueden cambiar la marca." }, { status: 401 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant || tenant !== payload.tenant) {
      return NextResponse.json({ error: "Error de contexto de organización." }, { status: 403 });
    }

    const { primary_color, secondary_color, logo_url } = await request.json();

    // 2. Validar colores (formato hex)
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (primary_color && !hexRegex.test(primary_color)) {
      return NextResponse.json({ error: "Formato de color primario inválido." }, { status: 400 });
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
      [tenant, primary_color || '#3b82f6', secondary_color || '#6366f1', logo_url || null]
    );

    return NextResponse.json({ success: true, message: "Configuración de marca actualizada." });
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
