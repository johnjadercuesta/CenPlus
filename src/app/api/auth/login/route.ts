import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant, sanitizeTenantValue } from "@/lib/tenant";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { identificacion, password, tenant: tenantParam } = await request.json();

    if (!identificacion || !password) {
      return NextResponse.json(
        { error: "Identificacion y contrasena son obligatorios" },
        { status: 400 }
      );
    }

    let tenant = sanitizeTenantValue(tenantParam) || getTenantFromRequest(request);

    if (!tenant) {
      try {
        const { rows: tenantRows } = await pool.query(
          "SELECT tenant FROM public.user_tenants WHERE identificacion = $1 LIMIT 1",
          [identificacion]
        );
        if (tenantRows.length > 0) {
          tenant = tenantRows[0].tenant;
        }
      } catch (e) {
      }
    }

    if (!tenant) {
      try {
        const { rows: schemas } = await pool.query(`
          SELECT schema_name FROM information_schema.schemata
          WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            AND schema_name NOT LIKE 'pg_%'
          ORDER BY schema_name = 'public' DESC, schema_name
        `);

        for (const s of schemas) {
          const schemaName = s.schema_name;
          try {
            const { rows: users } = await pool.query(
              `SELECT id FROM "${schemaName}".admins WHERE identificacion = $1 AND activo = 1 LIMIT 1`,
              [identificacion]
            );
            if (users.length > 0) {
              tenant = schemaName;
              break;
            }
          } catch {
          }
        }
      } catch (e) {
      }
    }

    if (!tenant) {
      return NextResponse.json(
        { error: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    const run = (sql: string, params: any[] = []) => queryWithTenant(tenant, sql, params);

    const { rows } = await run(
      "SELECT * FROM admins WHERE identificacion = $1 AND activo = 1",
      [identificacion]
    );
    const user = rows[0] as { id: number; email: string; password: string; nombre: string; role: string } | undefined;

    if (!user) {
      return NextResponse.json(
        { error: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Credenciales invalidas" },
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
    
    if (tenant) {
      const { recordLog } = await import("@/lib/audit");
      await recordLog({
        tenant,
        email: user.email,
        nombre: user.nombre,
        modulo: "autenticacion",
        accion: "Inicio sesion en el sistema",
      });
    }
    
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[login] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
