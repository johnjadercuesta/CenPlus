import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(request: NextRequest) {
  const payload = getTokenFromRequest(request);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Verificar si el tenant esta activo y si la sesion es valida
  if (payload.tenant) {
    try {
      const { rows } = await pool.query(
        'SELECT activo, session_version FROM public.tenants_config WHERE tenant = $1',
        [payload.tenant]
      );
      if (rows.length > 0) {
        const tc = rows[0];
        if (tc.activo === false) {
          return NextResponse.json({
            authenticated: false,
            disabled: true,
            message: "Organización deshabilitada. Contacte al administrador."
          }, { status: 403 });
        }
        const dbVersion = tc.session_version ?? 0;
        const tokenVersion = (payload as any).sessionVersion ?? 0;
        if (dbVersion > tokenVersion) {
          return NextResponse.json({
            authenticated: false,
            disabled: true,
            message: "Sesión invalidada. La organización fue desactivada y reactivada. Inicie sesión nuevamente."
          }, { status: 403 });
        }
      }
    } catch { /* table may not exist yet */ }
  }

  return NextResponse.json({
    authenticated: true,
    userId: payload.userId,
    email: payload.email,
    nombre: payload.nombre,
    role: payload.role,
  });
}
