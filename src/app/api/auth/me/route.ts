import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getTokenFromRequest } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getDefaultRoute } from "@/lib/modules";

export async function GET(request: NextRequest) {
  const payload = getTokenFromRequest(request);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Verificar si el tenant esta activo y si la sesion del tenant es valida
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
        const tokenVersion =
          (payload as any).tenantVersion ??
          (payload as any).sessionVersion ??
          0;
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

  // Validar usuario contra la base de datos (rol, estado y session_version propios)
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({
      authenticated: false,
      message: "Sesión inválida o usuario desactivado. Inicie sesión nuevamente."
    }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    userId: user.userId,
    email: user.email,
    nombre: user.nombre,
    role: user.role,
    dia_d_level: user.dia_d_level,
    modules: user.modules,
    readOnlyModules: user.readOnlyModules,
    defaultRoute: getDefaultRoute(user),
  });
}
