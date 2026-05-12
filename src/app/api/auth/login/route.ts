import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant, sanitizeTenantValue } from "@/lib/tenant";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password, tenant: tenantParam } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    // Get tenant from request or from body parameter
    let tenant = getTenantFromRequest(request);
    if (!tenant && tenantParam) {
      tenant = sanitizeTenantValue(tenantParam);
    }

    // Si no hay tenant en request, buscar en tabla global de usuarios
    if (!tenant) {
      try {
        const { rows: tenantRows } = await pool.query(
          "SELECT tenant FROM public.user_tenants WHERE email = $1 LIMIT 1",
          [email]
        );
        if (tenantRows.length > 0) {
          tenant = tenantRows[0].tenant;
        }
      } catch (e) {
        // Tabla no existe, ignorar
      }
    }

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant no especificado o inválido" },
        { status: 400 }
      );
    }

    const run = (sql: string, params: any[] = []) => queryWithTenant(tenant, sql, params);

    const { rows } = await run(
      "SELECT * FROM admins WHERE email = $1 AND activo = 1",
      [email]
    );
    const user = rows[0] as { id: number; email: string; password: string; nombre: string; role: string } | undefined;

    if (!user) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role as "administrador" | "estratega" | "lider",
      tenant: tenant || null,
    });

    const response = NextResponse.json({
      token,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
    });
    
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
