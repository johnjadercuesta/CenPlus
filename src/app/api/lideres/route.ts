import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organizaciÛn" }, { status: 403 });

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    const { rows: data } = await run(
      "SELECT id, email, nombre, role, activo, created_at FROM admins ORDER BY created_at DESC"
    );

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organizaciÛn" }, { status: 403 });

    const { email, password, nombre, role } = await request.json();

    if (!email || !password || !nombre) {
      return NextResponse.json({ error: "Email, contrase√±a y nombre son obligatorios" }, { status: 400 });
    }

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    const { rows: existingRows } = await run("SELECT id FROM admins WHERE email = $1", [email]);
    if (existingRows.length > 0) {
      return NextResponse.json({ error: "Este email ya est√° registrado" }, { status: 409 });
    }

    const hash = bcrypt.hashSync(password, 10);
    const validRoles = ["administrador", "estratega", "lider", "analista"];
    const targetRole = validRoles.includes(role) ? role : "lider";

    const { rows } = await run(
      "INSERT INTO admins (email, password, nombre, role) VALUES ($1, $2, $3, $4) RETURNING id, email, nombre, role, activo, created_at",
      [email, hash, nombre, targetRole]
    );

    return NextResponse.json({ data: rows[0], message: "Usuario creado exitosamente" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
